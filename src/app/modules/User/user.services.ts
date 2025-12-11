import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import * as bcrypt from "bcrypt";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { Prisma, User, UserRole } from "@prisma/client";
import config from "../../../config";
import httpStatus from "http-status";
import { Request } from "express";
import { fileUploader } from "../../../helpars/fileUploader";
import { Secret } from "jsonwebtoken";
import { jwtHelpers } from "../../../helpars/jwtHelpers";
import { generateUsername } from "../../../helpars/generateUsername";
import crypto from 'crypto';
import { generateOtpEmail } from "../../../shared/emailHTML";
import emailSender from "../../../shared/emailSender";

// Create a new user in the database.
const createUserIntoDb = async (payload: any) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      email: payload.email,
    },
  });

  if (existingUser) {
    if (existingUser.email === payload.email) {
      throw new ApiError(
        400,
        `User with this email ${payload.email} already exists`
      );
    }
  }

  const otp = Number(crypto.randomInt(1000, 9999));
  const expirationOtp = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  const hashedPassword: string = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds)
  );

  // Generate unique username
  // const uniqueUsername = await generateUsername(payload.firstName, payload.lastName);

  const uniqueUsername = await generateUsername(payload.fullName);

  const result = await prisma.user.create({
    data: {
      fullName: payload.fullName,
      email: payload.email,
      password: hashedPassword,
      userName: uniqueUsername,
      otp: otp,
      expirationOtp: expirationOtp
    },
    select: {
      otp: true,
      id: true,
      fullName: true,
      userName: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const token = jwtHelpers.generateToken(
    {
      id: result.id,
      email: result.email,
      role: result.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.expires_in as string
  );

  const html = generateOtpEmail(otp);
  await emailSender(payload.email, html, 'OTP Verification');
  return { result, message: "An OTP has been sent to your email. Please verify your account.", token };
};

//Reterive all users from the database also searcing and filetering
type IUserFilterRequest = {
  name?: string | undefined;
  email?: string | undefined;
  contactNumber?: string | undefined;
  searchTerm?: string | undefined;
}
const userSearchAbleFields = ["email", "fullName",];

const getUsersFromDb = async (
  params: IUserFilterRequest,
  options: IPaginationOptions
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  // 🔹 Automatically set users inactive if not logged in for 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  await prisma.user.updateMany({
    where: {
      lastLoginAt: { lt: threeMonthsAgo },
      status: 'ACTIVE',
    },
    data: { status: 'INACTIVE' },
  });

  const andCondions: Prisma.UserWhereInput[] = [];

  if (params.searchTerm) {
    andCondions.push({
      OR: userSearchAbleFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }
  if (Object.keys(filterData).length > 0) {
    andCondions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }
  const whereConditons: Prisma.UserWhereInput = { AND: andCondions };

  const result = await prisma.user.findMany({
    where: whereConditons,
    skip,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
          [options.sortBy]: options.sortOrder,
        }
        : {
          createdAt: "desc",
        },
    select: {
      id: true,
      fullName: true,
      userName: true,
      email: true,
      profileImage: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const total = await prisma.user.count({
    where: whereConditons,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
    message: (!result || result.length === 0)
      ? "No users found! Try again."
      : "Users fetched successfully.",
  };
};

// Get user by id
const getUserById = async (id: string) => {
  const result = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      fullName: true,
      userName: true,
      email: true,
      profileImage: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};

// update profile by user own profile uisng token or email or id
const updateProfile = async (req: Request) => {
  console.log(req.file, req.body.data);
  const file = req.file;
  const stringData = req.body.data;
  let image;
  let parseData;

  const existingUser = await prisma.user.findFirst({
    where: {
      id: req.user.id,
    },
  });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  if (file) {
    image = (await fileUploader.uploadToDigitalOcean(file)).Location;
  }

  if (stringData) {
    parseData = JSON.parse(stringData);
  }

  const result = await prisma.user.update({
    where: {
      id: existingUser.id, // Ensure `existingUser.id` is valid and exists
    },
    data: {
      fullName: parseData.fullName || existingUser.fullName,
      email: parseData.email || existingUser.email,
      profileImage: image || existingUser.profileImage,
      updatedAt: new Date(), // Assuming your model has an `updatedAt` field
    },
    select: {
      id: true,
      fullName: true,
      userName: true,
      email: true,
      profileImage: true,
    },
  });

  return result;
};

//Soft Delete
const softDeleteUser = async (id: string) => {
  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      isDeleted: true,
    },
  });
  return result;
}

// Hard Delete User by Admin
const deleteUser = async (id: string) => {

  await prisma.notification.deleteMany({
    where: {
      userId: id
    }
  })

  await prisma.follow.deleteMany({
    where: {
      OR: [{ followerId: id }, { followingId: id }],
    },
  });

  // 🧩 3️⃣ Delete Chats (as sender or receiver)
  await prisma.chat.deleteMany({
    where: {
      OR: [{ senderId: id }, { receiverId: id }],
    },
  });

  // 🧩 4️⃣ Delete Rooms (as sender or receiver)
  await prisma.room.deleteMany({
    where: {
      OR: [{ senderId: id }, { receiverId: id }],
    },
  });

  const result = await prisma.user.delete({
    where: {
      id,
    },
  });
  
  return result;
}

// Upload photo
const uploadPhoto = async (req: Request) => {
  const file = req.file;
  let imageUrl;
  if (!file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No file uploaded");
  }
  const uploadResult = await fileUploader.uploadToDigitalOcean(file);
  imageUrl = uploadResult.Location;

  return imageUrl;
}

export const userService = {
  createUserIntoDb,
  getUsersFromDb,
  getUserById,
  updateProfile,
  softDeleteUser,
  deleteUser,
  uploadPhoto,
};

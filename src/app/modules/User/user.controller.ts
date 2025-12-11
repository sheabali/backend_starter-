import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { userService } from "./user.services";
import { Request, Response } from "express";
import pick from "../../../shared/pick";

// create user
const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.createUserIntoDb(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User Registered successfully!",
    data: result,
  });
});

// get all user form db
const getUsers = catchAsync(async (req: Request, res: Response) => {
  const userFilterableFields = [
    "email",
    "searchTerm",
    "role",
  ];
  const filters = pick(req.query, userFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder'])
  const result = await userService.getUsersFromDb(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieve successfully!",
    data: result,
  });
});

// get user by id
const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await userService.getUserById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User retrieve successfully!",
    data: result,
  });
});

// Update userProfile form db
const updateProfile = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await userService.updateProfile(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully!",
    data: result,
  });
});

//Soft Delete
const softDeleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await userService.softDeleteUser(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully!",
    data: result,
  });
});

//Hard Delete
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await userService.deleteUser(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully!",
    data: result,
  });
});

const uploadPhoto = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.uploadPhoto(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Photo uploaded successfully!",
    data: result,
  });
});

export const userController = {
  createUser,
  getUsers,
  getUserById,
  updateProfile,
  softDeleteUser,
  deleteUser,
  uploadPhoto,
};

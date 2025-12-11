import express from "express";
import { userController } from "./user.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpars/fileUploader";
import userMessageToAdmin from "../../../shared/userMessageToAdmin";

const router = express.Router();

// *!register user
router.post("/register", userController.createUser);

// Get all  user
router.get("/", userController.getUsers);

// Get user by id
router.get("/:id", userController.getUserById);

// Update user's own Profile
router.put("/profile", auth(), fileUploader.uploadSingle, userController.updateProfile);

//Soft Delete user's own Profile
router.patch("/soft-delete/:id", auth(), userController.softDeleteUser);

// Hard Delete user by admin
router.delete("/delete/:id", auth(), userController.deleteUser);

// Support - USer message to admin
router.post("/support/message", async (req, res) => {
    try {
        const { name, phone, email, message } = req.body;

        if (!name || !phone || !email || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }

        await userMessageToAdmin(
            email,
            `<p><b>Name:</b> ${name}</p><p><b>Name:</b> ${phone}</p><p><b>Email:</b> ${email}</p><p><b>Message:</b><br/>${message}</p>`,
            "New Support Message"
        );

        res.json({ success: true, message: "Message sent to admin" });
    } catch (error) {
        res.status(500).json({ error: "Failed to send message" });
    }
});

router.post("/upload-photo", fileUploader.uploadSingle, auth(), userController.uploadPhoto);

export const userRoutes = router;

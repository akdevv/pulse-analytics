import express, { type Router } from "express";
import { register } from "./auth.controller.ts";
import { prisma } from "@/config/prisma.ts";

const router: Router = express.Router();

router.post("/register", register);
// router.post("/login", login);

router.get("/test", async (req, res) => {
  const data = await prisma.user.findMany();
  res.json(data);
});

router.post("/test", async (req, res) => {
  const data = await prisma.user.create({
    data: {
      email: "test@test.com",
      password: "password",
    },
  });
  res.json(data);
});

export default router;

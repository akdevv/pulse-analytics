import express, { type Router } from "express";
import { health } from "./health.controller.ts";

const router: Router = express.Router();

router.get("/", health);

export default router;

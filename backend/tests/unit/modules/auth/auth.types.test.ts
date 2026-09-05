import { describe, it, expect } from "vitest";
import {
  registerUserSchema,
  loginUserSchema,
  updateUserSchema,
} from "@/modules/auth/auth.types.ts";

describe("registerUserSchema", () => {
  it("valid input passes", () => {
    const result = registerUserSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(true);
  });

  it("missing email fails", () => {
    const result = registerUserSchema.safeParse({
      name: "John Doe",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });

  it("invalid email format fails", () => {
    const result = registerUserSchema.safeParse({
      name: "John Doe",
      email: "not-an-email",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });

  it("password shorter than 8 chars fails", () => {
    const result = registerUserSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "Pass1",
    });
    expect(result.success).toBe(false);
  });

  it("password with no uppercase fails", () => {
    const result = registerUserSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "password1",
    });
    expect(result.success).toBe(false);
  });

  it("password with no digit fails", () => {
    const result = registerUserSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "PasswordOnly",
    });
    expect(result.success).toBe(false);
  });

  it("password longer than 128 chars fails", () => {
    const result = registerUserSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "A1" + "a".repeat(127),
    });
    expect(result.success).toBe(false);
  });
});

describe("loginUserSchema", () => {
  it("valid input passes", () => {
    const result = loginUserSchema.safeParse({
      email: "john@example.com",
      password: "anypassword",
    });
    expect(result.success).toBe(true);
  });

  it("empty password fails", () => {
    const result = loginUserSchema.safeParse({
      email: "john@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("invalid email fails", () => {
    const result = loginUserSchema.safeParse({
      email: "bad-email",
      password: "anypassword",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("empty object passes (all fields optional)", () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("name-only update passes", () => {
    const result = updateUserSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("invalid email fails", () => {
    const result = updateUserSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("weak password fails", () => {
    const result = updateUserSchema.safeParse({ password: "weak" });
    expect(result.success).toBe(false);
  });
});

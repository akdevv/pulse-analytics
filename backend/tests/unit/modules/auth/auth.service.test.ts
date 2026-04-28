import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/auth.repository.ts", () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  findUserById: vi.fn(),
  updateUserById: vi.fn(),
  updateLastLoginAt: vi.fn(),
}));
vi.mock("bcrypt");
vi.mock("jsonwebtoken");

import * as repo from "@/modules/auth/auth.repository.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  registerUser,
  loginUser,
  refreshTokenService,
  getUserById,
  updateUserService,
} from "@/modules/auth/auth.service.ts";

const mockUser = {
  id: "user-1",
  name: "Alice",
  email: "alice@example.com",
  password: "hashed",
  isVerified: false,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── registerUser ─────────────────────────────────────────────────────────────

describe("registerUser", () => {
  it("missing email → throws AppError(400)", async () => {
    await expect(
      registerUser({ name: "Alice", email: "", password: "Password1" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("missing password → throws AppError(400)", async () => {
    await expect(
      registerUser({ name: "Alice", email: "alice@example.com", password: "" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("existing user → throws AppError(409)", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(mockUser);
    await expect(
      registerUser({ name: "Alice", email: "alice@example.com", password: "Password1" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("new user → hashes password, calls createUser, returns tokens", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(repo.createUser).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed" as never);
    vi.mocked(jwt.sign)
      .mockReturnValueOnce("access-token" as any)
      .mockReturnValueOnce("refresh-token" as any);

    const result = await registerUser({
      name: "Alice",
      email: "alice@example.com",
      password: "Password1",
    });

    expect(bcrypt.hash).toHaveBeenCalledWith("Password1", 10);
    expect(repo.createUser).toHaveBeenCalled();
    expect(result).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("both tokens are non-empty strings", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(repo.createUser).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed" as never);
    vi.mocked(jwt.sign)
      .mockReturnValueOnce("access-token" as any)
      .mockReturnValueOnce("refresh-token" as any);

    const result = await registerUser({
      name: "Alice",
      email: "alice@example.com",
      password: "Password1",
    });

    expect(typeof result.accessToken).toBe("string");
    expect(result.accessToken.length).toBeGreaterThan(0);
    expect(typeof result.refreshToken).toBe("string");
    expect(result.refreshToken.length).toBeGreaterThan(0);
  });
});

// ─── loginUser ────────────────────────────────────────────────────────────────

describe("loginUser", () => {
  it("user not found → throws AppError(404)", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null);
    await expect(
      loginUser({ email: "nobody@example.com", password: "Password1" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("wrong password → throws AppError(400)", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    await expect(
      loginUser({ email: "alice@example.com", password: "WrongPass" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("correct credentials → calls updateLastLoginAt, returns tokens", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(repo.updateLastLoginAt).mockResolvedValue(undefined as never);
    vi.mocked(jwt.sign)
      .mockReturnValueOnce("access-token" as any)
      .mockReturnValueOnce("refresh-token" as any);

    const result = await loginUser({
      email: "alice@example.com",
      password: "Password1",
    });

    expect(repo.updateLastLoginAt).toHaveBeenCalledWith(mockUser.id);
    expect(result).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
  });
});

// ─── refreshTokenService ──────────────────────────────────────────────────────

describe("refreshTokenService", () => {
  it("invalid/expired token → propagates jwt error", async () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error("jwt expired");
    });
    await expect(refreshTokenService("bad-token")).rejects.toThrow("jwt expired");
  });

  it("valid token → returns new accessToken", async () => {
    vi.mocked(jwt.verify).mockReturnValue({ userId: "123", email: "a@b.com" } as any);
    vi.mocked(jwt.sign).mockReturnValue("new-access-token" as any);

    const result = await refreshTokenService("valid-refresh");
    expect(result).toEqual({ accessToken: "new-access-token" });
  });
});

// ─── getUserById ──────────────────────────────────────────────────────────────

describe("getUserById", () => {
  it("user not found → returns null", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(null);
    const result = await getUserById("missing-id");
    expect(result).toBeNull();
  });

  it("user found → returns public shape (no password, createdAt, updatedAt)", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(mockUser);
    const result = await getUserById("user-1");
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
    expect(result).toMatchObject({ id: mockUser.id, email: mockUser.email });
  });
});

// ─── updateUserService ────────────────────────────────────────────────────────

describe("updateUserService", () => {
  it("user not found → throws AppError(404)", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(null);
    await expect(
      updateUserService("missing", { name: "Bob" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("no fields provided → throws AppError(400)", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(mockUser);
    await expect(updateUserService("user-1", {})).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("name update only → calls updateUserById with just name", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(mockUser);
    vi.mocked(repo.updateUserById).mockResolvedValue({ ...mockUser, name: "Bob" });

    await updateUserService("user-1", { name: "Bob" });

    expect(repo.updateUserById).toHaveBeenCalledWith("user-1", { name: "Bob" });
  });

  it("password update → hashes before saving", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.hash).mockResolvedValue("new-hashed" as never);
    vi.mocked(repo.updateUserById).mockResolvedValue({ ...mockUser });

    await updateUserService("user-1", { password: "NewPass1" });

    expect(bcrypt.hash).toHaveBeenCalledWith("NewPass1", 10);
    expect(repo.updateUserById).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ password: "new-hashed" })
    );
  });

  it("returns public user shape", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(mockUser);
    vi.mocked(repo.updateUserById).mockResolvedValue({ ...mockUser, name: "Bob" });

    const result = await updateUserService("user-1", { name: "Bob" });

    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });
});

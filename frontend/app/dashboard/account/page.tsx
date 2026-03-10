"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api/client";

interface User {
  id: string;
  username?: string;
  name: string;
  email: string;
  createdAt?: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((data: any) => setUser(data.data ?? data))
      .catch(() => setError("Failed to load user info"));
  }, []);

  if (error) return <div>{error}</div>;
  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ padding: "24px", fontFamily: "monospace" }}>
      <h1>Account</h1>
      <br />
      {user.username && (
        <p>
          <strong>Username:</strong> {user.username}
        </p>
      )}
      <p>
        <strong>Name:</strong> {user.name}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      <p>
        <strong>ID:</strong> {user.id}
      </p>
      {user.createdAt && (
        <p>
          <strong>Joined:</strong>{" "}
          {new Date(user.createdAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

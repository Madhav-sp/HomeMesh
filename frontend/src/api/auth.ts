import { api } from "./client";

export async function login(
  email: string,
  password: string,
) {
  const response = await api.post("/api/v1/auth/login", {
    email,
    password,
  });

  const token = response.data.access_token;

  if (!token) {
    throw new Error("No access token returned.");
  }

  localStorage.setItem("access_token", token);

  return response.data;
}

export async function register(
  email: string,
  password: string,
) {
  const response = await api.post("/api/v1/auth/register", {
    email,
    password,
  });

  return response.data;
}

export function logout() {
  localStorage.removeItem("access_token");
}
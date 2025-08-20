import bcrypt from "bcrypt";
import { pool } from "../../../dataBase/conecctionDataBase.js";

const SALT_ROUNDS = 10; // Constante para las rondas de hash

// 👉 Agregar usuario
export const addUser = async (username, password, role) => {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const query =
      "INSERT INTO users_hotel (username, password, role) VALUES (?, ?, ?)";
    const [result] = await pool.query(query, [username, hashedPassword, role]);
    console.log(`✅ Usuario ${username} agregado con ID ${result.insertId}.`);
  } catch (error) {
    console.error(`❌ Error al agregar el usuario ${username}:`, error);
    throw error;
  }
};

// 👉 Buscar usuario por username
export const findUserByUsername = async (username) => {
  try {
    const query = "SELECT * FROM users_hotel WHERE username = ?";
    const [rows] = await pool.query(query, [username]);
    console.log("Resultados:", rows);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error(`❌ Error al buscar el usuario ${username}:`, error);
    throw error;
  }
};

// 👉 Verificar contraseña
export const verifyPassword = async (inputPassword, storedPassword) => {
  if (!inputPassword || !storedPassword) {
    console.error("❌ Error: Contraseña ingresada o almacenada es inválida.");
    return false;
  }
  try {
    return await bcrypt.compare(inputPassword, storedPassword);
  } catch (error) {
    console.error("❌ Error al verificar la contraseña:", error);
    return false;
  }
};

// 👉 Actualizar contraseña de un usuario por ID
export const updateUserPassword = async (userId, newPassword) => {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const query = "UPDATE users_hotel SET password = ? WHERE id = ?";
    const [result] = await pool.query(query, [hashedPassword, userId]);
    console.log(`✅ Contraseña del usuario ${userId} actualizada.`, result);
  } catch (error) {
    console.error(
      `❌ Error al actualizar la contraseña del usuario ${userId}:`,
      error
    );
    throw error;
  }
};

// 👉 Actualizar contraseña de un usuario por username
export const updateUserPasswordByUsername = async (username, newPassword) => {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const query = "UPDATE users_hotel SET password = ? WHERE username = ?";
    const [result] = await pool.query(query, [hashedPassword, username]);
    console.log(`✅ Contraseña del usuario ${username} actualizada.`, result);
  } catch (error) {
    console.error(
      `❌ Error al actualizar la contraseña del usuario ${username}:`,
      error
    );
    throw error;
  }
};

// 👉 Login de usuario
export const loginUser = async (username, password) => {
  try {
    const user = await findUserByUsername(username);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error("Contraseña incorrecta");
    }

    console.log(`✅ Usuario ${username} autenticado correctamente.`);
    return user;
  } catch (error) {
    console.error(`❌ Error en login de usuario ${username}:`, error.message);
    throw error;
  }
};

// 👉 Seed inicial de usuarios
const seedUsers = async () => {
  const users = [
    { username: "manuel", password: "manuel123", role: "Administrador" },
    { username: "daniela", password: "dani1234", role: "Usuario" },
  ];

  try {
    for (const user of users) {
      const existingUser = await findUserByUsername(user.username);
      if (!existingUser) {
        await addUser(user.username, user.password, user.role);
        console.log(`✅ Usuario ${user.username} agregado correctamente.`);
      } else {
        console.log(
          `ℹ️ Usuario ${user.username} ya existe. No se agregó nuevamente.`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error al agregar usuarios iniciales:", error);
  }
};

// 👇 Descomenta si quieres ejecutar el seed automáticamente
 seedUsers();

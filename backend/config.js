require("dotenv").config();
require("colors");

const SECRET_KEY = process.env.SUPABASE_KEY || "secret-dev";

const PORT = 3001;

function getDatabaseUri() {
  return process.env.NODE_ENV === "test"
    ? "postgresql:///carnivore_cart_test"
    : process.env.SUPABASE_URL || "postgresql:///carnivore_cart";
}

const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === "test" ? 1 : 12;

console.log("Forzza:".green);
console.log("SECRET_KEY:".yellow, SECRET_KEY);
console.log("PORT:".yellow, PORT.toString());
console.log("BCRYPT_WORK_FACTOR".yellow, BCRYPT_WORK_FACTOR);
console.log("Database:".yellow, getDatabaseUri());
console.log("---");

module.exports = {
  SECRET_KEY,
  PORT,
  BCRYPT_WORK_FACTOR,
  getDatabaseUri,
};

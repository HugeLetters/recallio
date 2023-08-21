/** @type {import("prettier").Config} */
const config = {
  plugins: [require.resolve("prettier-plugin-tailwindcss")],
  printWidth: 100,
  singleAttributePerLine: true,
  endOfLine: "auto",
};

module.exports = config;

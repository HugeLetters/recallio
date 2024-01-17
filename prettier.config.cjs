/** @type {import("prettier").Config} */
const config = {
  plugins: [require.resolve("prettier-plugin-tailwindcss")],
  printWidth: 100,
  singleAttributePerLine: true,
  trailingComma: "all",
};

module.exports = config;

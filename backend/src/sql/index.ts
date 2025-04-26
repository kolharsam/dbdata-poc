import fs from "fs";

const getIntrospectQuery = () => {
  return fs.readFileSync("src/sql/introspect.sql", "utf8");
};

export { getIntrospectQuery };

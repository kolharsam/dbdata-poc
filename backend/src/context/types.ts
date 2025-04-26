type SchemaInfoRecord = {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  character_maximum_length: string | null;
  numeric_precision: string | null;
  numeric_scale: string | null;
  is_nullable: string;
  column_default: string | null;
  constraint_types: string | null;
  constraint_names: string | null;
  foreign_table_names: string | null;
  foreign_column_names: string | null;
  index_names: string;
  index_definitions: string;
  check_clauses: string;
  comments: string | null;
};

type SchemaInfo = SchemaInfoRecord[];

export { SchemaInfo };

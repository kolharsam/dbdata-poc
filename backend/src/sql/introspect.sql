-- TODO: make this a function that takes a list of schema as input
-- TODO: return a json object with the schema information
-- TODO: This is the format of a json object from the following query
-- NOTE: check the field names and also make sure we have more data than
-- necessary about the tables and the schema of the database than we need
-- {
--     "table_schema": "public",
--     "table_name": "cities",
--     "column_name": "location",
--     "data_type": "point",
--     "character_maximum_length": null,
--     "numeric_precision": null,
--     "numeric_scale": null,
--     "is_nullable": "YES",
--     "column_default": null,
--     "constraint_types": null,
--     "constraint_names": null,
--     "foreign_table_names": null,
--     "foreign_column_names": null,
--     "index_names": "cities_pkey",
--     "index_definitions": "CREATE UNIQUE INDEX cities_pkey ON public.cities USING btree (name)",
--     "check_clauses": "name IS NOT NULL",
--     "comments": null
--   }
WITH
    table_info AS (
        SELECT
            t.table_schema,
            t.table_name,
            c.column_name,
            c.data_type,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            c.is_nullable,
            c.column_default
        FROM
            information_schema.tables AS t
            LEFT JOIN information_schema.columns AS c ON t.table_schema = c.table_schema
            AND t.table_name = c.table_name
        WHERE
            t.table_schema IN ('public')
    ),
    constraints_info AS (
        SELECT
            tc.table_schema,
            tc.table_name,
            kcu.column_name,
            STRING_AGG (tc.constraint_type, ', ') AS constraint_types,
            STRING_AGG (tc.constraint_name, ', ') AS constraint_names,
            STRING_AGG (ccu.table_name, ', ') AS foreign_table_names,
            STRING_AGG (ccu.column_name, ', ') AS foreign_column_names
        FROM
            information_schema.table_constraints AS tc
            LEFT JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
        WHERE
            tc.table_schema IN ('public')
        GROUP BY
            tc.table_schema,
            tc.table_name,
            kcu.column_name
    ),
    index_info AS (
        SELECT
            i.schemaname AS table_schema,
            i.tablename AS table_name,
            STRING_AGG (i.indexname, ', ') AS index_names,
            STRING_AGG (i.indexdef, '; ') AS index_definitions
        FROM
            pg_indexes AS i
        WHERE
            i.schemaname IN ('public')
        GROUP BY
            i.schemaname,
            i.tablename
    ),
    check_constraints AS (
        SELECT
            tc.table_schema,
            tc.table_name,
            STRING_AGG (cc.check_clause, '; ') AS check_clauses
        FROM
            information_schema.check_constraints AS cc
            JOIN information_schema.table_constraints AS tc ON cc.constraint_name = tc.constraint_name
            AND cc.constraint_schema = tc.table_schema
        WHERE
            tc.constraint_type = 'CHECK'
            AND tc.table_schema IN ('public')
        GROUP BY
            tc.table_schema,
            tc.table_name
    ),
    comments AS (
        SELECT
            n.nspname AS table_schema,
            c.relname AS table_name,
            a.attname AS column_name,
            STRING_AGG (d.description, '; ') AS comments
        FROM
            pg_description AS d
            JOIN pg_class AS c ON d.objoid = c.oid
            JOIN pg_namespace AS n ON c.relnamespace = n.oid
            LEFT JOIN pg_attribute AS a ON d.objsubid = a.attnum
            AND d.objoid = a.attrelid
        WHERE
            n.nspname IN ('public')
        GROUP BY
            n.nspname,
            c.relname,
            a.attname
    )
SELECT
    ti.table_schema,
    ti.table_name,
    ti.column_name,
    ti.data_type,
    ti.character_maximum_length,
    ti.numeric_precision,
    ti.numeric_scale,
    ti.is_nullable,
    ti.column_default,
    ci.constraint_types,
    ci.constraint_names,
    ci.foreign_table_names,
    ci.foreign_column_names,
    ix.index_names,
    ix.index_definitions,
    cc.check_clauses,
    cm.comments
FROM
    table_info AS ti
    LEFT JOIN constraints_info AS ci ON ti.table_schema = ci.table_schema
    AND ti.table_name = ci.table_name
    AND ti.column_name = ci.column_name
    LEFT JOIN index_info AS ix ON ti.table_schema = ix.table_schema
    AND ti.table_name = ix.table_name
    LEFT JOIN check_constraints AS cc ON ti.table_schema = cc.table_schema
    AND ti.table_name = cc.table_name
    LEFT JOIN comments AS cm ON ti.table_schema = cm.table_schema
    AND ti.table_name = cm.table_name
    AND ti.column_name = cm.column_name
ORDER BY
    ti.table_schema,
    ti.table_name,
    ti.column_name;
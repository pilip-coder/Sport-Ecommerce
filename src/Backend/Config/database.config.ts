import mysql, {
  type Pool,
  type QueryResult,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

import { environment } from "./environment";


type QueryParam = string | number | boolean | Date | Buffer | null;
export type QueryParams = QueryParam[];

export const databasePool: Pool = mysql.createPool({
  host: environment.databaseHost,
  port: environment.databasePort,
  user: environment.databaseUser,
  password: environment.databasePassword,
  database: environment.databaseName,
  connectionLimit: environment.databaseConnectionLimit,
  waitForConnections: true,
  queueLimit: 0,
});

export const connectDatabase = async (): Promise<void> => {
  try {
    const connection = await databasePool.getConnection();

    try {
      await connection.ping();
      console.log(
        `MySQL connected: ${environment.databaseHost}:${environment.databasePort}/${environment.databaseName}`,
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Unable to establish MySQL connection.", error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  await databasePool.end();
};

export const executeQuery = async <T extends QueryResult = RowDataPacket[]>(
  sql: string,
  params: QueryParams = [],
): Promise<T> => {
  const [rows] = await databasePool.execute<T>(sql, params);
  return rows;
};

export type QueryRows = RowDataPacket[];
export type QueryWriteResult = ResultSetHeader;

import amqp, { type Channel, Connection } from "amqplib";
import dotenv from "dotenv";
import path from "path";

// Load the environment variables
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Connect to RabbitMQ
export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);
    console.log("Connected to RabbitMQ");
    const channel = await connection.createChannel();
    return { connection, channel };
  } catch (error) {
    console.error("Error connecting to RabbitMQ: ", error);
    throw error;
  }
};

// ACTUAL CODE ///

//TODO: FIX THE TYPE ISSUE

// // Connection and channel variables
// let connection: Connection | null = null;
// let channel: Channel | null = null;

// // Connect to RabbitMQ
// export const connectRabbitMQ = async () => {
//   if (connection && channel) {
//     return { connection, channel };
//   }

//   //TODO: FIX THE TYPE ISSUE
//   try {
//     connection = await amqp.connect(RABBITMQ_URL);
//     console.log("Connected to RabbitMQ");
//     channel = await connection.createChannel();
//     return { connection, channel };
//   } catch (error) {
//     console.error("Error connecting to RabbitMQ: ", error);
//     throw error;
//   }
// };

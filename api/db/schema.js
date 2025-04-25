import { relations } from "drizzle-orm";
import { pgTable, uuid, varchar ,timestamp,pgEnum,text,integer} from "drizzle-orm/pg-core"

export const userTypeEnum = pgEnum("user_type", ["user", "guide", "transporter","host"]); 

  export const users = pgTable('users', {
    id: uuid("id").defaultRandom().primaryKey(),
    email:varchar('email').unique().notNull(),
    hashedpwd:varchar('hashedpwd').notNull(),
    name:varchar('name').notNull(),
    firstName:varchar('firstName').notNull(),
    phoneNumber: varchar("phoneNumber").notNull(),
    userType:userTypeEnum("userType").notNull(),
    bankUrl :  varchar("bankUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    totalTrips : integer("totalTrips").default(0).notNull(),
    totalFails : integer("totalFails").default(0).notNull(),
  });



  export const messages = pgTable('messages', {
    id: uuid("id").defaultRandom().primaryKey(),
    message: text("message").notNull(),
    userId: uuid("userId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  });


export const AccountRelations = relations(messages, ({ one }) => ({
    users: one(users, {
      fields: [messages.userId],
      references: [users.id],
    }),
  }));
  
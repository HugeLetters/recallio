import { relations } from "drizzle-orm";
import { review } from "../product";
import { account, session, user } from ".";

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  reviews: many(review),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

import { db } from "@/database";
import { user } from "@/database/schema/auth";
import {
  category,
  review,
  reviewsToCategories,
  type ReviewInsert,
} from "@/database/schema/product";
import { utapi } from "@/server/uploadthing";
import { clamp } from "@/utils";
import { faker } from "@faker-js/faker";
import { and, asc, like, lt, sql, type InferInsertModel, type SQL } from "drizzle-orm";
import type { MySqlTableWithColumns, TableConfig } from "drizzle-orm/mysql-core";
import task, { type Task } from "tasuku";

seed().catch(console.error);
async function seed() {
  await seedReviews(10000, 150, 10).catch(console.error);
}

type BarcodeData = { barcode: string; rating: number; names: string[] };
const TEST_USER_ID_PREFIX = "test-user-";

async function seedReviews(
  reviewCount: number,
  reviewsPerUser: number,
  uniqieReviewsPerUser: number,
) {
  const [, files] = await Promise.all([cleanDatabase(100000), cleanUTFiles()]);
  await createTestUsers(reviewCount / reviewsPerUser);

  const users = (await db.select().from(user)).map((user) => user.id);

  const barcodePool: BarcodeData[] = faker.helpers
    .uniqueArray(randomBarcode, users.length)
    .map((barcode) => createBarcodeData(barcode, users.length / 10));

  await task("User reviews", async ({ setStatus: setOuterStatus, task }) => {
    let usersProcessed = 0;
    setOuterStatus(`${usersProcessed}%`);
    await task("User processing", async ({ setTitle }) => {
      for (const user of users) {
        setTitle(`User ${user} processing`);
        const barcodes = faker.helpers.arrayElements(
          barcodePool,
          reviewsPerUser - uniqieReviewsPerUser,
        );
        await createReviews(user, barcodes, files).catch(console.error);

        const unqieBarcodes = faker.helpers
          .uniqueArray(randomBarcode, uniqieReviewsPerUser)
          .map((barcode) => createBarcodeData(barcode, 1));
        await createReviews(user, unqieBarcodes, files).catch(console.error);
        setOuterStatus(`${((100 * ++usersProcessed) / users.length).toFixed(2)}%`);
      }
    });
  });
}

async function createReviews(user: string, barcodes: BarcodeData[], files: string[]) {
  const values = barcodes.map((barcodeData) => createReviewValue(user, barcodeData, files));

  const reviews: ReviewInsert[] = values.map(({ review }) => review);
  await db.insert(review).values(reviews);

  const categories: InferInsertModel<typeof category>[] = values.flatMap(
    ({ categories }) => categories?.map((name) => ({ name })) ?? [],
  );
  if (!categories.length) return;

  await db
    .insert(category)
    .values(categories)
    .onDuplicateKeyUpdate({ set: { name: sql`${category.name}` } });

  const reviewsCategories: InferInsertModel<typeof reviewsToCategories>[] = values.flatMap(
    ({ review, categories }) =>
      categories?.map((category) => ({
        barcode: review.barcode,
        userId: review.userId,
        category,
      })) ?? [],
  );
  await db.insert(reviewsToCategories).values(reviewsCategories);
}

function createReviewValue(
  user: string,
  { barcode, names, rating }: BarcodeData,
  files: string[],
): { review: ReviewInsert; categories?: string[] } {
  return {
    review: {
      userId: user,
      barcode,
      name: faker.helpers.arrayElement(names),
      rating: clamp(0, rating + faker.number.int({ min: -1, max: 1 }), 5),
      comment: faker.helpers.maybe(randomParagraph),
      pros: faker.helpers.maybe(randomParagraph, { probability: 0.8 }),
      cons: faker.helpers.maybe(randomParagraph, { probability: 0.8 }),
      isPrivate: Math.random() > 0.5,
      imageKey: faker.helpers.maybe(() => faker.helpers.arrayElement(files)),
    },
    categories: faker.helpers.maybe(
      () =>
        faker.helpers.uniqueArray(
          () => faker.word.adjective(),
          faker.number.int({ min: 0, max: 10 }),
        ),
      { probability: 0.9 },
    ),
  };
}

function randomParagraph() {
  return faker.lorem.paragraph({ min: 1, max: 5 });
}

function randomBarcode() {
  return faker.number.int({ min: 10_000_000_000_000, max: 99_999_999_999_999 }).toString();
}

function randomName() {
  return faker.word.noun();
}

function randomBaseRating() {
  return faker.number.int({ min: 0, max: 5 });
}

function createBarcodeData(barcode: string, namecount: number) {
  return {
    barcode,
    rating: randomBaseRating(),
    names: faker.helpers.uniqueArray(randomName, Math.max(3, namecount)),
  };
}

function createTestUsers(userCount: number) {
  const userIdSuffixList = faker.helpers.uniqueArray(() => faker.word.words(1), userCount);

  return db.insert(user).values(
    userIdSuffixList.map((idSuffix) => ({
      id: `${TEST_USER_ID_PREFIX}${idSuffix}`,
      name: faker.helpers.arrayElement([
        () => faker.person.fullName(),
        () => faker.internet.displayName(),
        () => faker.internet.userName(),
      ])(),
      email: faker.internet.email({ provider: faker.lorem.word() }),
      image: faker.helpers.arrayElement([
        () => faker.image.avatar(),
        () => faker.image.url(),
        () => null,
      ])(),
    })),
  );
}

async function cleanDatabase(rowLimitPerOperation: number) {
  await task("Cleaning database", async ({ task }) => {
    await cleanTable({
      task,
      taskName: "Cleaning reviews-to-categories",
      table: reviewsToCategories,
      primaryKey: "barcode",
      rowLimitPerOperation,
    });

    await cleanTable({
      task,
      taskName: "Cleaning categories",
      table: category,
      primaryKey: "name",
      rowLimitPerOperation,
    });

    await cleanTable({
      task,
      taskName: "Cleaning reviews",
      table: review,
      primaryKey: "barcode",
      rowLimitPerOperation,
    });

    await cleanTable({
      task,
      taskName: "Cleaning test users",
      table: user,
      primaryKey: "id",
      rowLimitPerOperation,
      where: like(user.id, `${TEST_USER_ID_PREFIX}%`),
    });
  });
}

type CleanTableOptions<T extends TableConfig> = {
  task: Task;
  taskName: string;
  table: MySqlTableWithColumns<T>;
  primaryKey: keyof T["columns"];
  rowLimitPerOperation: number;
  where?: SQL;
};
async function cleanTable<T extends TableConfig>({
  task,
  taskName,
  table,
  primaryKey,
  rowLimitPerOperation,
  where,
}: CleanTableOptions<T>) {
  return task(taskName, async ({ setStatus }) => {
    let rowsDeleted = 0;
    const primaryColumn = table[primaryKey];
    while (true) {
      const [row] = await db
        .select({ id: primaryColumn })
        .from(table)
        .limit(1)
        .offset(rowLimitPerOperation)
        .orderBy(asc(primaryColumn));

      const { rowsAffected } = await db
        .delete(table)
        .where(and(row ? lt(primaryColumn, row.id) : undefined, where));

      rowsDeleted += rowsAffected;
      setStatus(`Deleted ${rowsDeleted} rows`);
      if (!rowsAffected) return;
    }
  });
}

async function cleanUTFiles() {
  const { uploaded, failed } = await utapi.listFiles().then((files) => {
    return files.reduce<{ uploaded: string[]; failed: string[] }>(
      (result, file) => {
        file.status !== "Failed" ? result.uploaded.push(file.key) : result.failed.push(file.key);
        return result;
      },
      { uploaded: [], failed: [] },
    );
  });

  if (failed.length) {
    await utapi.deleteFiles(failed);
  }
  return uploaded;
}

import { blobToFile } from "@/image/blob";
import {
  PRODUCT_NAME_LENGTH_MAX,
  PRODUCT_NAME_LENGTH_MIN,
  PRODUCT_RATING_MAX,
} from "@/product/validation";
import { db } from "@/server/database/client/serverless";
import type { ReviewInsert } from "@/server/database/schema/product";
import {
  category,
  productMeta,
  review,
  reviewsToCategories,
} from "@/server/database/schema/product";
import { user } from "@/server/database/schema/user";
import { utapi } from "@/server/uploadthing/api";
import { clamp } from "@/utils";
import { filterMap } from "@/utils/array/filter";
import { faker } from "@faker-js/faker";
import type { SQL } from "drizzle-orm";
import { and, asc, like, lt } from "drizzle-orm";
import type { SQLiteTableWithColumns, TableConfig } from "drizzle-orm/sqlite-core";
import type { Task } from "tasuku";
import task from "tasuku";

export default async function seed() {
  await seedReviews({
    reviewCount: 300000,
    reviewsPerUser: 400,
    uniqueReviewsPerUser: 30,
  }).catch(console.error);
}

type BarcodeData = { barcode: string; rating: number; names: string[] };
const TEST_USER_ID_PREFIX = "test-user-";

type SeedReviewOptiosn = {
  reviewCount: number;
  reviewsPerUser: number;
  uniqueReviewsPerUser: number;
};
async function seedReviews({
  reviewCount,
  reviewsPerUser,
  uniqueReviewsPerUser,
}: SeedReviewOptiosn) {
  const [files] = await Promise.all([seedUtImages(100), cleanDatabase(100000)]);
  await createTestUsers(reviewCount / reviewsPerUser);
  const users = await db
    .select({ id: user.id })
    .from(user)
    .all()
    .then((users) => users.map(({ id }) => id));

  const namePool = faker.helpers.uniqueArray(randomName, Math.min(users.length, 4000));
  const commonBarcodes = faker.helpers
    .uniqueArray(randomBarcode, users.length)
    .map((barcode) => createBarcodeData(barcode, namePool, users.length / 10));

  await task("User reviews", async ({ setStatus: setOuterStatus, task }) => {
    let usersProcessed = 0;
    setOuterStatus(`${usersProcessed}%`);
    await task("User processing", async ({ setTitle }) => {
      for (const user of users) {
        setTitle(`User ${user} processing`);
        const barcodes = faker.helpers.arrayElements(
          commonBarcodes,
          Math.max(reviewsPerUser - uniqueReviewsPerUser, 1),
        );

        const unqieBarcodes = faker.helpers
          .uniqueArray(randomBarcode, Math.max(reviewsPerUser - barcodes.length, 1))
          .map((barcode) => createBarcodeData(barcode, namePool, 1));
        await createReviews(user, barcodes.concat(unqieBarcodes), files).catch(console.error);

        setOuterStatus(`${((100 * ++usersProcessed) / users.length).toFixed(2)}%`);
      }
    });
  });
}

async function createReviews(user: string, barcodes: BarcodeData[], files: string[]) {
  const values = barcodes.map((barcodeData) => createReviewValue(user, barcodeData, files));

  const reviews: ReviewInsert[] = values.map(({ review }) => review);
  const reviewInsert = db.insert(review).values(reviews);

  const categories: Array<typeof category.$inferInsert> = values.flatMap(
    ({ categories }) => categories?.map((name) => ({ name })) ?? [],
  );
  if (!categories.length) {
    await reviewInsert;
    return;
  }

  const reviewsCategories: Array<typeof reviewsToCategories.$inferInsert> = values.flatMap(
    ({ review, categories }) =>
      categories?.map((category) => ({
        barcode: review.barcode,
        userId: review.userId,
        category,
      })) ?? [],
  );
  await db.batch([
    reviewInsert,
    db.insert(category).values(categories).onConflictDoNothing(),
    db.insert(reviewsToCategories).values(reviewsCategories),
  ]);
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
      imageKey: files.length
        ? faker.helpers.maybe(() => faker.helpers.arrayElement(files))
        : undefined,
      updatedAt: faker.helpers.maybe(() => faker.date.past({ years: 3 }), { probability: 0.9 }),
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

const randomBarcodeOptions = { min: 10_000_000_000_000, max: 99_999_999_999_999 };
function randomBarcode() {
  return faker.number.int(randomBarcodeOptions).toString();
}

const randomNameOptions = {
  length: { min: PRODUCT_NAME_LENGTH_MIN, max: PRODUCT_NAME_LENGTH_MAX },
};
function randomName() {
  return faker.word.noun(randomNameOptions);
}

const randomBaseStringOptions = { min: 0, max: PRODUCT_RATING_MAX };
function randomBaseRating() {
  return faker.number.int(randomBaseStringOptions);
}

function randomImage() {
  return faker.image.url();
}

function createBarcodeData(barcode: string, namepool: string[], namecount: number): BarcodeData {
  return {
    barcode,
    rating: randomBaseRating(),
    names: faker.helpers.arrayElements(namepool, Math.max(namecount, 3)),
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
      image: faker.helpers.maybe(randomImage),
    })),
  );
}

async function cleanDatabase(rowLimitPerOperation: number) {
  await task("Cleaning database", async ({ task }) => {
    await cleanTable({
      task,
      taskName: "Cleaning test users",
      table: user,
      primaryKey: "id",
      rowLimitPerOperation,
      where: like(user.id, `${TEST_USER_ID_PREFIX}%`),
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
      taskName: "Cleaning categories",
      table: category,
      primaryKey: "name",
      rowLimitPerOperation,
    });

    await cleanTable({
      task,
      taskName: "Cleaning reviews-to-categories",
      table: reviewsToCategories,
      primaryKey: "barcode",
      rowLimitPerOperation,
    });

    await cleanTable({
      task,
      taskName: "Cleaning product-meta",
      table: productMeta,
      primaryKey: "barcode",
      rowLimitPerOperation,
    });
  });
}

type CleanTableOptions<T extends TableConfig> = {
  task: Task;
  taskName: string;
  table: SQLiteTableWithColumns<T>;
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
      const row = await db
        .select({ id: primaryColumn })
        .from(table)
        .limit(1)
        .offset(rowLimitPerOperation)
        .orderBy(asc(primaryColumn))
        .get();

      const { rowsAffected } = await db
        .delete(table)
        .where(and(row ? lt(primaryColumn, row.id) : undefined, where));

      rowsDeleted += rowsAffected;
      setStatus(`Deleted ${rowsDeleted} rows`);
      if (!rowsAffected) return;
    }
  });
}

async function seedUtImages(count: number): Promise<string[]> {
  const { removed = [], uploaded = [] } = await utapi
    .listFiles()
    .then(({ files }) =>
      splitBy(files, (file) => (file.status === "Uploaded" ? "uploaded" : "removed")),
    );

  if (removed.length) {
    await utapi.deleteFiles(removed.map((file) => file.key));
  }
  const remaining = count - uploaded.length;
  return Promise.all(
    faker.helpers
      .uniqueArray(randomImage, remaining)
      .map((url) => fetch(url).then((r) => r.blob())),
  )
    .then((blobs) => {
      if (!blobs.length) return [];
      return utapi.uploadFiles(
        blobs.map((blob) =>
          blobToFile(blob, `${faker.location.country()}-${faker.location.city()}`),
        ),
      );
    })
    .then((responses) =>
      filterMap(
        responses,
        (response, bad) => (!!response.data ? response : bad),
        (x) => x.data.key,
      ).concat(uploaded.map((file) => file.key)),
    );
}

function splitBy<T, R extends string>(array: ReadonlyArray<T>, getBucket: (value: T) => R) {
  return array.reduce<Partial<Record<R, T[]>>>((acc, el) => {
    const bucket = getBucket(el);
    acc[bucket] ??= [];
    acc[bucket]?.push(el);
    return acc;
  }, {});
}

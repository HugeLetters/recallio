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
import { like, sql, type InferInsertModel } from "drizzle-orm";
import task from "tasuku";

seed().catch(console.error);
async function seed() {
  await seedReviews(1000000, 150, 10).catch(console.error);
}

type BarcodeData = { barcode: string; rating: number; names: string[] };

async function seedReviews(
  reviewCount: number,
  reviewsPerUser: number,
  unqieReviewsPerUser: number,
) {
  await db.delete(reviewsToCategories);
  await db.delete(category);
  await db.delete(review);
  await db.delete(user).where(like(user.id, `${testUserIdPrefix}%`));
  await createTestUsers(reviewCount / reviewsPerUser);

  const users = (await db.select().from(user)).map((user) => user.id);
  const files = (await utapi.listFiles())
    .filter(({ status }) => status === "Uploaded")
    .map((file) => file.key);

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
          reviewsPerUser - unqieReviewsPerUser,
        );
        await createReviews(user, barcodes, files).catch(console.error);

        const unqieBarcodes = faker.helpers
          .uniqueArray(randomBarcode, unqieReviewsPerUser)
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

const testUserIdPrefix = "test-user-";
function createTestUsers(userCount: number) {
  const userIdSuffixList = faker.helpers.uniqueArray(() => faker.word.words(1), userCount);

  return db.insert(user).values(
    userIdSuffixList.map((idSuffix) => ({
      id: `${testUserIdPrefix}${idSuffix}`,
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

import { db } from "@/database";
import { createReview } from "@/database/query/review";
import { user } from "@/database/schema/auth";
import { category, review, reviewsToCategories } from "@/database/schema/product";
import { clamp } from "@/utils";
import { faker } from "@faker-js/faker";
import { and, eq, like } from "drizzle-orm";
import task from "tasuku";
import { utapi } from "uploadthing/server";

seed().catch(console.error);
async function seed() {
  await seedReviews(5000, 50).catch(console.error);
}
async function seedReviews(reviewCount: number, userCount: number) {
  await db.delete(reviewsToCategories);
  await db.delete(category);
  await db.delete(review);
  await db.delete(user).where(like(user.id, `${testUserIdPrefix}%`));
  await createTestUsers(userCount);

  const users = (await db.select().from(user)).map((user) => user.id);
  const files = (await utapi.listFiles()).map((file) => file.key);
  const barcodePool = faker.helpers
    .uniqueArray(randomBarcode, (1.1 * reviewCount) / users.length)
    .map((barcode) => ({
      barcode,
      rating: faker.number.int({ min: 0, max: 5 }),
      names: faker.helpers.uniqueArray(() => faker.word.noun(), Math.max(3, users.length / 10)),
    }));

  await task("User reviews", async ({ setStatus: setOuterStatus, task }) => {
    let usersProcessed = 0;
    setOuterStatus(`${usersProcessed}%`);
    await task("User processing", async ({ setStatus, setTitle }) => {
      for (const user of users) {
        setTitle(`User ${user} processing`);
        const barcodes = faker.helpers.arrayElements(barcodePool, reviewCount / users.length);
        let barcodesProcessed = 0;
        setStatus(`${barcodesProcessed}%`);

        for (const { barcode, rating, names } of barcodes) {
          await createMockReview({ user, barcode, names, rating }, files);
          setStatus(`${((100 * ++barcodesProcessed) / barcodes.length).toFixed(2)}%`);
        }

        setOuterStatus(`${((100 * ++usersProcessed) / users.length).toFixed(2)}%`);
      }
    });
  });

  for (let i = 0; i < reviewCount / 10; i++) {
    await createMockReview(
      { user: faker.helpers.arrayElement(users), barcode: randomBarcode() },
      files
    );
  }
}

async function createMockReview(
  data: { user: string; barcode: string; names?: string[]; rating?: number },
  files: string[]
) {
  await createReview(
    {
      userId: data.user,
      barcode: data.barcode,
      name: data.names ? faker.helpers.arrayElement(data.names) : faker.word.noun(),
      rating: data.rating
        ? clamp(0, data.rating + faker.number.int({ min: -1, max: 1 }), 5)
        : faker.number.int({ min: 0, max: 5 }),
      comment: faker.helpers.maybe(randomParagraph),
      pros: faker.helpers.maybe(randomParagraph, { probability: 0.8 }),
      cons: faker.helpers.maybe(randomParagraph, { probability: 0.8 }),
      isPrivate: Math.random() > 0.5,
    },
    faker.helpers.maybe(
      () =>
        faker.helpers.uniqueArray(
          () => faker.word.adjective(),
          faker.number.int({ min: 0, max: 10 })
        ),
      { probability: 0.9 }
    )
  );
  await db
    .update(review)
    .set({ imageKey: faker.helpers.maybe(() => faker.helpers.arrayElement(files)) })
    .where(and(eq(review.userId, data.user), eq(review.barcode, data.barcode)));
}

function randomParagraph() {
  return faker.lorem.paragraph({ min: 1, max: 5 });
}

function randomBarcode() {
  return faker.number.int({ min: 10_000_000_000_000, max: 99_999_999_999_999 }).toString();
}

const testUserIdPrefix = "test-user-";
function createTestUsers(userCount: number) {
  const userIdSuffixList = faker.helpers.uniqueArray(() => {
    return faker.helpers.arrayElement([
      () => faker.vehicle.manufacturer().toLowerCase(),
      () => faker.science.chemicalElement().name.toLowerCase(),
    ])();
  }, userCount);

  return db.insert(user).values(
    userIdSuffixList.map((idSuffix) => ({
      id: `${testUserIdPrefix}${idSuffix}`,
      name: faker.helpers.arrayElement([
        () => faker.person.fullName(),
        () => faker.internet.displayName(),
        () => faker.internet.userName(),
      ])(),
      email: faker.internet.email(),
      image: faker.helpers.arrayElement([
        () => faker.image.avatar(),
        () => faker.image.url(),
        () => null,
      ])(),
    }))
  );
}

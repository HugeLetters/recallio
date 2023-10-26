import { db } from "@/database";
import { createReview } from "@/database/query/review";
import { user } from "@/database/schema/auth";
import { category, review, reviewsToCategories } from "@/database/schema/product";
import { faker } from "@faker-js/faker";
import { utapi } from "uploadthing/server";

seed().catch(console.error);
async function seed() {
  await seedReviews(500).catch(console.error);
}
async function seedReviews(reviewCount: number) {
  await db.delete(reviewsToCategories);
  await db.delete(category);
  await db.delete(review);

  const users = (await db.select().from(user)).map((user) => user.id);
  const files = (await utapi.listFiles()).map((file) => file.key);
  const barcodes = faker.helpers.uniqueArray(randomBarcode, reviewCount / users.length);

  for (const barcode of barcodes) {
    const names = faker.helpers.uniqueArray(() => faker.word.noun(), users.length);
    for (const user of users) {
      await createMockReview({ user, barcode, names }, files);
    }
  }

  for (let i = 0; i < reviewCount / 10; i++) {
    await createMockReview(
      { user: faker.helpers.arrayElement(users), barcode: randomBarcode() },
      files
    );
  }
}

async function createMockReview(
  data: { user: string; barcode: string; names?: string[] },
  files: string[]
) {
  return await createReview(
    {
      userId: data.user,
      barcode: data.barcode,
      name: data.names ? faker.helpers.arrayElement(data.names) : faker.word.noun(),
      rating: faker.number.int({ min: 0, max: 5 }),
      comment: Math.random() > 0.5 ? faker.lorem.sentences({ min: 0, max: 3 }) : null,
      pros:
        Math.random() > 0.2
          ? Array.from({ length: faker.number.int({ min: 1, max: 7 }) })
              .map(() => faker.word.words(faker.number.int({ min: 1, max: 5 })))
              .join("\n")
          : null,
      cons:
        Math.random() > 0.2
          ? Array.from({ length: faker.number.int({ min: 1, max: 7 }) })
              .map(() => faker.word.words(faker.number.int({ min: 1, max: 5 })))
              .join("\n")
          : null,
      imageKey: Math.random() > 0.5 ? faker.helpers.arrayElement(files) : null,
      isPrivate: Math.random() > 0.5,
    },
    faker.helpers.uniqueArray(() => faker.word.adjective(), faker.number.int({ min: 0, max: 10 }))
  );
}

function randomBarcode() {
  return faker.number.int({ min: 10_000_000_000_000, max: 99_999_999_999_999 }).toString();
}

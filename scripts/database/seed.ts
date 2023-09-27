import { userRepository } from "@/database/repository/auth";
import { reviewRepository } from "@/database/repository/product";
import { faker } from "@faker-js/faker";
import { utapi } from "uploadthing/server";

seed().catch(console.error);
async function seed() {
  await seedReviews().catch(console.error);
}
async function seedReviews() {
  const users = (await userRepository.findMany(() => undefined)).map((user) => user.id);
  const files = (await utapi.listFiles()).map((file) => file.key);

  for (let i = 0; i < 500; i++) {
    await reviewRepository.createWithCategories(
      {
        userId: faker.helpers.arrayElement(users),
        barcode: faker.number.int({ min: 10_000_000_000_000, max: 99_999_999_999_999 }).toString(),
        name: faker.word.noun(),
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
      },
      faker.helpers.uniqueArray(() => faker.word.adjective(), faker.number.int({ min: 0, max: 10 }))
    );
  }
}

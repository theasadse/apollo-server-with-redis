import fetch from "node-fetch";

async function create1000UsersViaGraphQL() {
  const baseUrl = "http://localhost:4001/graphql";
  const totalUsers = 1000;
  const batchSize = 10;
  let createdCount = 0;

  console.log("🌱 Starting to create 1000 users via GraphQL API...");
  console.log("⏳ This may take a moment...\n");

  try {
    for (let batch = 0; batch < totalUsers / batchSize; batch++) {
      const startIdx = batch * batchSize;
      const endIdx = Math.min(startIdx + batchSize, totalUsers);

      for (let i = startIdx; i < endIdx; i++) {
        const userNum = i + 1;
        const randomDomain = ["demo", "example", "test", "user", "account"][
          Math.floor(Math.random() * 5)
        ];
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const email = `user${userNum}.${randomDomain}${randomSuffix}@${randomDomain}.com`;
        const name = `User ${userNum}`;
        const password = `password_${userNum}`;

        const query = `
          mutation {
            createUser(name: "${name}", email: "${email}", password: "${password}") {
              id
              name
              email
            }
          }
        `;

        try {
          const response = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
          });

          const result = await response.json();

          if (result.data?.createUser) {
            createdCount++;
          } else if (result.errors && result.errors[0]?.message.includes("already exists")) {
            createdCount++; // Count duplicates as created (user already existed)
          } else {
            console.error(`Failed to create user ${userNum}:`, result.errors);
          }
        } catch (err) {
          console.error(`Error creating user ${userNum}:`, err);
        }
      }

      const progress = Math.round((createdCount / totalUsers) * 100);
      if (progress % 10 === 0) {
        console.log(`✅ Created ${createdCount}/${totalUsers} users (${progress}%)`);
      }
    }

    console.log(`\n🎉 Successfully created ${createdCount} users!`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

create1000UsersViaGraphQL();

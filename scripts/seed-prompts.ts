import { db } from "../server/db";
import { prompts } from "@shared/schema";

const defaultPrompts = [
  { question: "A life goal of mine is...", category: "goals" },
  { question: "I'm looking for someone who...", category: "dating" },
  { question: "My simple pleasures are...", category: "lifestyle" },
  { question: "The way to win me over is...", category: "dating" },
  { question: "I get along best with people who...", category: "personality" },
  { question: "My most irrational fear is...", category: "fun" },
  { question: "The best way to ask me out is...", category: "dating" },
  { question: "I'm convinced that...", category: "opinions" },
  { question: "My favorite quality in a person is...", category: "dating" },
  { question: "I won't shut up about...", category: "interests" },
  { question: "Two truths and a lie...", category: "fun" },
  { question: "My love language is...", category: "dating" },
  { question: "A perfect first date would be...", category: "dating" },
  { question: "I'm weirdly attracted to...", category: "fun" },
  { question: "The last show I binged was...", category: "entertainment" },
];

async function seedPrompts() {
  console.log("Seeding prompts...");
  
  for (const prompt of defaultPrompts) {
    try {
      await db.insert(prompts).values(prompt);
      console.log(`Added: ${prompt.question}`);
    } catch (e) {
      console.log(`Skipped (already exists): ${prompt.question}`);
    }
  }
  
  console.log("Done seeding prompts!");
  process.exit(0);
}

seedPrompts().catch(console.error);

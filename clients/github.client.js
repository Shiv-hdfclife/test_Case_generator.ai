import axios from "axios";

export const githubClient = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "inspire-qa-automation"
  }
});



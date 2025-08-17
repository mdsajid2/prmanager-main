import { Router, Request, Response } from "express";
import { CommentRequestSchema } from "../schemas";
import { parsePRUrl, postPRComment } from "../services/github";

const router = Router();

router.post("/comment", async (req: Request, res: Response) => {
  try {
    // Validate request
    const validatedData = CommentRequestSchema.parse(req.body);
    const { pr_url, comment_markdown, github_token } = validatedData;

    // Parse PR URL
    const parsed = parsePRUrl(pr_url);
    if (!parsed) {
      return res.status(400).json({ error: "Invalid GitHub PR URL format" });
    }

    const { owner, repo, number } = parsed;

    // Post comment
    await postPRComment(owner, repo, number, comment_markdown, github_token);

    res.json({
      success: true,
      message: "Comment posted successfully",
      comment_url: `https://github.com/${owner}/${repo}/pull/${number}#issuecomment-new`,
    });
  } catch (error) {
    console.error("Comment posting error:", error);

    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res
        .status(500)
        .json({ error: "An unexpected error occurred while posting comment" });
    }
  }
});

export default router;

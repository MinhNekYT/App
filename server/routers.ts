import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createVmLogSignature,
  dispatchWorkflow,
  getRequestOrigin,
  validateLinuxHostname,
} from "./github";

const githubSettingsSchema = z.object({
  githubOwner: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9-]+$/, "GitHub owner không hợp lệ."),
  githubRepo: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/, "Tên repository không hợp lệ."),
  workflowFile: z.string().trim().min(1).max(255).regex(/^[A-Za-z0-9_.-]+\.ya?ml$/, "Nhập tên tệp workflow .yml hoặc .yaml."),
  ref: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_./-]+$/, "Git ref không hợp lệ."),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  github: router({
    settings: protectedProcedure.query(({ ctx }) => db.getUserGithubSettings(ctx.user.id)),
    saveSettings: protectedProcedure.input(githubSettingsSchema).mutation(({ ctx, input }) =>
      db.saveUserGithubSettings(ctx.user.id, input)
    ),
  }),
  vm: router({
    list: protectedProcedure.query(({ ctx }) => db.listVmInstances(ctx.user.id)),
    details: protectedProcedure.input(z.object({ instanceId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const instance = await db.getVmForUser(input.instanceId, ctx.user.id);
      if (!instance) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy VM instance." });
      const logs = await db.getVmLogs(instance.id);
      return { instance, logs };
    }),
    create: protectedProcedure.input(z.object({
      hostname: z.string().trim().min(1).max(63),
      githubToken: z.string().min(1).max(2_000),
      acknowledgment: z.literal(true),
    })).mutation(async ({ ctx, input }) => {
      const hostname = validateLinuxHostname(input.hostname);
      const settings = await db.getUserGithubSettings(ctx.user.id);
      if (!settings) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Hãy cấu hình GitHub Actions repository trong Settings trước khi tạo VPS.",
        });
      }

      const instance = await db.createVmInstance({
        userId: ctx.user.id,
        hostname,
        githubOwner: settings.githubOwner,
        githubRepo: settings.githubRepo,
        workflowFile: settings.workflowFile,
      });
      const origin = getRequestOrigin(ctx.req.headers as Record<string, string | string[] | undefined>);
      const callbackUrl = `${origin}/api/vm-logs/${instance.id}?sig=${createVmLogSignature(instance.id)}`;
      await db.appendVmLog(instance.id, `Đã xếp hàng tạo Linux VPS «${hostname}».`);

      try {
        const result = await dispatchWorkflow({
          owner: settings.githubOwner,
          repo: settings.githubRepo,
          workflowFile: settings.workflowFile,
          ref: settings.ref,
          hostname,
          callbackUrl,
          token: input.githubToken,
        });
        await db.updateVmFromCallback(instance.id, {
          workflowRunId: result.runId?.toString(),
          status: "running",
        });
        await db.appendVmLog(instance.id, "GitHub Actions đã nhận yêu cầu. Đang chờ output setup từ runner…");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể kích hoạt GitHub Actions.";
        await db.markVmDispatchFailed(instance.id, message);
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }

      const created = await db.getVmForUser(instance.id, ctx.user.id);
      return created;
    }),
  }),
});

export type AppRouter = typeof appRouter;

import { prisma } from './index';

export async function logEvent(
  type: string,
  payload?: unknown,
  entity?: string,
  entityId?: string,
) {
  await prisma.event.create({
    data: {
      type,
      entity,
      entityId,
      payload: payload as any,
    },
  });
}

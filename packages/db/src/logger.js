import { prisma } from './index';
export async function logEvent(type, payload, entity, entityId) {
    await prisma.event.create({
        data: {
            type,
            entity,
            entityId,
            payload: payload,
        },
    });
}

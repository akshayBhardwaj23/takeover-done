import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-ecom/db';

export const runtime = 'edge';

interface TriggerData {
  type: 'shopify_event' | 'email_intent' | 'scheduled';
  event?: string;
  intent?: string;
  data: any;
  userId?: string;
  shopDomain?: string;
}

/**
 * Playbook Execution Engine
 * 
 * This endpoint evaluates triggers and executes matching playbooks.
 * It can be called from:
 * - Shopify webhooks
 * - Email intent detection
 * - Scheduled cron jobs
 */
export async function POST(req: NextRequest) {
  try {
    const triggerData: TriggerData = await req.json();
    
    if (!triggerData.userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Find matching playbooks
    const playbooks = await prisma.playbook.findMany({
      where: {
        userId: triggerData.userId,
        enabled: true,
      },
    });

    const matchingPlaybooks = playbooks.filter((playbook) => {
      const trigger = playbook.trigger as any;
      
      // Check if trigger type matches
      if (trigger.type !== triggerData.type) return false;
      
      // Check specific trigger config
      if (triggerData.type === 'shopify_event') {
        return trigger.config?.event === triggerData.event;
      }
      
      if (triggerData.type === 'email_intent') {
        return trigger.config?.intent === triggerData.intent;
      }
      
      if (triggerData.type === 'scheduled') {
        // For scheduled, we assume the cron job already filtered
        return true;
      }
      
      return false;
    });

    const results = [];

    // Execute each matching playbook
    for (const playbook of matchingPlaybooks) {
      try {
        // Evaluate conditions
        const conditionsMet = evaluateConditions(
          playbook.conditions as any[],
          triggerData.data
        );

        if (!conditionsMet) {
          results.push({
            playbookId: playbook.id,
            status: 'skipped',
            reason: 'Conditions not met',
          });
          continue;
        }

        // Calculate AI confidence (simplified - in real implementation, call AI)
        const confidence = calculateConfidence(playbook, triggerData.data);

        // Determine if should auto-execute
        const shouldAutoExecute =
          !playbook.requiresApproval &&
          confidence >= playbook.confidenceThreshold;

        if (shouldAutoExecute) {
          // Execute actions
          const executionResult = await executeActions(
            playbook.actions as any[],
            triggerData.data,
            triggerData.userId
          );

          // Log execution
          await prisma.playbookExecution.create({
            data: {
              playbookId: playbook.id,
              status: 'executed',
              confidence,
              triggerData: triggerData as any,
              result: executionResult as any,
            },
          });

          // Update playbook stats
          await prisma.playbook.update({
            where: { id: playbook.id },
            data: {
              executionCount: { increment: 1 },
              lastExecutedAt: new Date(),
            },
          });

          results.push({
            playbookId: playbook.id,
            status: 'executed',
            confidence,
            result: executionResult,
          });
        } else {
          // Create pending execution for approval
          await prisma.playbookExecution.create({
            data: {
              playbookId: playbook.id,
              status: 'pending',
              confidence,
              triggerData: triggerData as any,
            },
          });

          results.push({
            playbookId: playbook.id,
            status: 'pending_approval',
            confidence,
            reason: playbook.requiresApproval
              ? 'Manual approval required'
              : `Confidence ${(confidence * 100).toFixed(0)}% below threshold ${(playbook.confidenceThreshold * 100).toFixed(0)}%`,
          });
        }
      } catch (error: any) {
        console.error(`Error executing playbook ${playbook.id}:`, error);
        
        await prisma.playbookExecution.create({
          data: {
            playbookId: playbook.id,
            status: 'failed',
            triggerData: triggerData as any,
            error: error.message,
          },
        });

        results.push({
          playbookId: playbook.id,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      matched: matchingPlaybooks.length,
      results,
    });
  } catch (error: any) {
    console.error('Playbook execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute playbooks' },
      { status: 500 }
    );
  }
}

/**
 * Evaluate if all conditions are met
 */
function evaluateConditions(conditions: any[], data: any): boolean {
  if (!conditions || conditions.length === 0) return true;

  for (const condition of conditions) {
    const fieldValue = getNestedValue(data, condition.field);
    const conditionValue = condition.value;

    let met = false;

    switch (condition.operator) {
      case '==':
        met = String(fieldValue) === String(conditionValue);
        break;
      case '!=':
        met = String(fieldValue) !== String(conditionValue);
        break;
      case '>':
        met = Number(fieldValue) > Number(conditionValue);
        break;
      case '<':
        met = Number(fieldValue) < Number(conditionValue);
        break;
      case 'contains':
        met = String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
        break;
      case 'not_contains':
        met = !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
        break;
      default:
        met = false;
    }

    if (!met) return false;
  }

  return true;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Calculate AI confidence score
 * In production, this would call an AI model
 */
function calculateConfidence(playbook: any, data: any): number {
  // Simplified confidence calculation
  // In real implementation, this would:
  // 1. Send data to AI model
  // 2. Get confidence score for each action
  // 3. Return overall confidence
  
  const baseConfidence = 0.85;
  const conditionCount = Array.isArray(playbook.conditions) ? playbook.conditions.length : 0;
  
  // More conditions met = higher confidence
  if (conditionCount > 2) {
    return Math.min(0.95, baseConfidence + 0.1);
  }
  
  return baseConfidence;
}

/**
 * Execute all actions in sequence
 */
async function executeActions(actions: any[], data: any, userId: string): Promise<any> {
  const results: any[] = [];

  for (const action of actions) {
    try {
      let result: any = null;

      switch (action.type) {
        case 'auto_refund':
          result = await executeRefund(data, action.config, userId);
          break;
        case 'auto_exchange':
          result = await executeExchange(data, action.config, userId);
          break;
        case 'send_email':
          result = await executeSendEmail(data, action.config, userId);
          break;
        case 'create_discount':
          result = await executeCreateDiscount(data, action.config, userId);
          break;
        case 'add_tag':
          result = await executeAddTag(data, action.config, userId);
          break;
        case 'send_notification':
          result = await executeSendNotification(data, action.config, userId);
          break;
        case 'restock_product':
          result = await executeRestockAlert(data, action.config, userId);
          break;
        default:
          result = { success: false, error: 'Unknown action type' };
      }

      results.push({ action: action.type, result });
    } catch (error: any) {
      results.push({ action: action.type, error: error.message });
    }
  }

  return results;
}

// Action executors (stubs - would integrate with Shopify API, Mailgun, etc.)
async function executeRefund(data: any, config: any, userId: string) {
  // TODO: Integrate with Shopify Refund API
  console.log('Executing refund:', { data, config, userId });
  return { success: true, stub: true, message: 'Refund would be processed via Shopify API' };
}

async function executeExchange(data: any, config: any, userId: string) {
  // TODO: Integrate with Shopify Order API
  console.log('Executing exchange:', { data, config, userId });
  return { success: true, stub: true, message: 'Exchange would be created via Shopify API' };
}

async function executeSendEmail(data: any, config: any, userId: string) {
  // TODO: Integrate with Mailgun or existing email system
  console.log('Executing send email:', { data, config, userId });
  return { success: true, stub: true, message: 'Email would be sent via Mailgun' };
}

async function executeCreateDiscount(data: any, config: any, userId: string) {
  // TODO: Integrate with Shopify Discount API
  console.log('Executing create discount:', { data, config, userId });
  return { success: true, stub: true, message: 'Discount code would be created via Shopify API' };
}

async function executeAddTag(data: any, config: any, userId: string) {
  // TODO: Integrate with Shopify Customer API
  console.log('Executing add tag:', { data, config, userId });
  return { success: true, stub: true, message: 'Tag would be added via Shopify API' };
}

async function executeSendNotification(data: any, config: any, userId: string) {
  // TODO: Integrate with Slack/Email notification system
  console.log('Executing send notification:', { data, config, userId });
  return { success: true, stub: true, message: 'Notification would be sent' };
}

async function executeRestockAlert(data: any, config: any, userId: string) {
  // TODO: Integrate with inventory management system
  console.log('Executing restock alert:', { data, config, userId });
  return { success: true, stub: true, message: 'Restock alert would be sent' };
}


// Re-export types from packages/api/src/meta-ads for client-side use
// Note: Functions are server-side only in packages/api
// Using relative path since @ai-ecom/api path alias might not resolve sub-modules
export type {
  MetaAdAccount,
  MetaAdsInsights,
} from '../../../packages/api/src/meta-ads';

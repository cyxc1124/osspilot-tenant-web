export type PolicyEffect = 'Allow' | 'Deny';

export interface PolicyStatementForm {
  sid?: string;
  effect: PolicyEffect;
  principal: string;
  action: string[];
  resource: string[];
  not_action?: string[];
  not_resource?: string[];
  /** IAM fields not editable in the visual form (e.g. Condition, NotPrincipal). */
  preservedFields?: Record<string, unknown>;
}

export interface PolicyFormValues {
  version: string;
  statements: PolicyStatementForm[];
  /** Top-level policy keys not editable in the visual form. */
  preservedPolicyFields?: Record<string, unknown>;
}

export const S3_ACTION_OPTIONS = [
  's3:GetObject',
  's3:PutObject',
  's3:DeleteObject',
  's3:ListBucket',
  's3:GetBucketLocation',
  's3:AbortMultipartUpload',
  's3:ListMultipartUploadParts',
  's3:*',
] as const;

const BUCKET_LEVEL_ACTIONS = new Set<string>(['s3:ListBucket', 's3:GetBucketLocation']);

export const POLICY_VERSION_OPTIONS = ['2012-10-17', '2008-10-17'] as const;

const KNOWN_POLICY_KEYS = new Set(['Version', 'Statement']);
const KNOWN_STATEMENT_KEYS = new Set([
  'Sid',
  'Effect',
  'Principal',
  'Action',
  'Resource',
  'NotAction',
  'NotResource',
]);

export const UNSUPPORTED_VISUAL_STATEMENT_KEYS = [
  'NotAction',
  'NotResource',
  'NotPrincipal',
  'Condition',
] as const;

export class PolicyFormValidationError extends Error {
  constructor(public readonly code: 'invalidPrincipalJson') {
    super(code);
    this.name = 'PolicyFormValidationError';
  }
}

export function bucketResourceArn(bucketName: string): string {
  return `arn:aws:s3:::${bucketName}`;
}

export function bucketObjectArnPrefix(bucketName: string): string {
  return `arn:aws:s3:::${bucketName}/`;
}

export function allObjectsResourceArn(bucketName: string): string {
  return `${bucketObjectArnPrefix(bucketName)}*`;
}

export function buildObjectResourceArn(bucketName: string, suffix: string): string {
  const trimmed = suffix.trim().replace(/^\/+/, '');
  if (!trimmed) {
    return bucketResourceArn(bucketName);
  }
  return `${bucketObjectArnPrefix(bucketName)}${trimmed}`;
}

export function resourceArnSuffix(bucketName: string, arn: string): string | null {
  const prefix = bucketObjectArnPrefix(bucketName);
  if (arn === bucketResourceArn(bucketName)) {
    return '';
  }
  if (arn.startsWith(prefix)) {
    return arn.slice(prefix.length);
  }
  return null;
}

export function suggestResourcesForActions(bucketName: string, actions: string[]): string[] {
  if (actions.length === 0) {
    return [];
  }
  let needBucket = false;
  let needObject = false;
  for (const action of actions) {
    if (action === 's3:*') {
      needBucket = true;
      needObject = true;
      break;
    }
    if (BUCKET_LEVEL_ACTIONS.has(action)) {
      needBucket = true;
    } else if (action.startsWith('s3:')) {
      needObject = true;
    }
  }
  const suggestions: string[] = [];
  if (needBucket) {
    suggestions.push(bucketResourceArn(bucketName));
  }
  if (needObject) {
    suggestions.push(allObjectsResourceArn(bucketName));
  }
  return suggestions;
}

export function missingSuggestedResources(
  bucketName: string,
  actions: string[],
  resources: string[],
): string[] {
  return suggestResourcesForActions(bucketName, actions).filter((arn) => !resources.includes(arn));
}

function toStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function principalToForm(principal: unknown): string {
  if (principal === '*') {
    return '*';
  }
  if (principal === undefined || principal === null) {
    return '*';
  }
  if (typeof principal === 'string') {
    return principal;
  }
  return JSON.stringify(principal);
}

export function parsePrincipalFromForm(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === '*') {
    return '*';
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      throw new PolicyFormValidationError('invalidPrincipalJson');
    }
  }
  return trimmed;
}

export function defaultStatement(bucketName: string): PolicyStatementForm {
  return {
    sid: '',
    effect: 'Allow',
    principal: '*',
    action: ['s3:GetObject'],
    resource: [allObjectsResourceArn(bucketName)],
  };
}

function extractPreservedStatementFields(record: Record<string, unknown>): Record<string, unknown> {
  const preserved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!KNOWN_STATEMENT_KEYS.has(key)) {
      preserved[key] = value;
    }
  }
  return preserved;
}

function statementToForm(statement: unknown): PolicyStatementForm {
  if (!statement || typeof statement !== 'object' || Array.isArray(statement)) {
    return {
      sid: '',
      effect: 'Allow',
      principal: '*',
      action: [],
      resource: [],
    };
  }
  const record = statement as Record<string, unknown>;
  const effect = record.Effect === 'Deny' ? 'Deny' : 'Allow';
  const preservedFields = extractPreservedStatementFields(record);
  return {
    sid: typeof record.Sid === 'string' ? record.Sid : '',
    effect,
    principal: principalToForm(record.Principal),
    action: toStringArray(record.Action),
    resource: toStringArray(record.Resource),
    not_action: toStringArray(record.NotAction),
    not_resource: toStringArray(record.NotResource),
    preservedFields: Object.keys(preservedFields).length > 0 ? preservedFields : undefined,
  };
}

function statementFromForm(statement: PolicyStatementForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...(statement.preservedFields ?? {}),
    Effect: statement.effect,
    Principal: parsePrincipalFromForm(statement.principal),
  };
  if (statement.sid?.trim()) {
    payload.Sid = statement.sid.trim();
  } else {
    delete payload.Sid;
  }
  if (statement.action.length > 0) {
    payload.Action = statement.action.length === 1 ? statement.action[0] : statement.action;
  } else {
    delete payload.Action;
  }
  if (statement.resource.length > 0) {
    payload.Resource = statement.resource.length === 1 ? statement.resource[0] : statement.resource;
  } else {
    delete payload.Resource;
  }
  if (statement.not_action && statement.not_action.length > 0) {
    payload.NotAction =
      statement.not_action.length === 1 ? statement.not_action[0] : statement.not_action;
  } else {
    delete payload.NotAction;
  }
  if (statement.not_resource && statement.not_resource.length > 0) {
    payload.NotResource =
      statement.not_resource.length === 1 ? statement.not_resource[0] : statement.not_resource;
  } else {
    delete payload.NotResource;
  }
  return payload;
}

function extractPreservedPolicyFields(policy: Record<string, unknown>): Record<string, unknown> {
  const preserved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(policy)) {
    if (!KNOWN_POLICY_KEYS.has(key)) {
      preserved[key] = value;
    }
  }
  return preserved;
}

export function policyToFormValues(
  policy: Record<string, unknown> | null,
  bucketName: string,
): PolicyFormValues {
  if (!policy) {
    return {
      version: '2012-10-17',
      statements: [defaultStatement(bucketName)],
    };
  }
  const statements = Array.isArray(policy.Statement)
    ? policy.Statement.map(statementToForm)
    : [defaultStatement(bucketName)];
  const preservedPolicyFields = extractPreservedPolicyFields(policy);
  return {
    version: typeof policy.Version === 'string' ? policy.Version : '2012-10-17',
    statements: statements.length > 0 ? statements : [defaultStatement(bucketName)],
    preservedPolicyFields:
      Object.keys(preservedPolicyFields).length > 0 ? preservedPolicyFields : undefined,
  };
}

export function formValuesToPolicy(values: PolicyFormValues): Record<string, unknown> {
  return {
    ...(values.preservedPolicyFields ?? {}),
    Version: values.version,
    Statement: (values.statements ?? []).map(statementFromForm),
  };
}

function statementHasUnsupportedVisualFields(record: Record<string, unknown>): boolean {
  return UNSUPPORTED_VISUAL_STATEMENT_KEYS.some((key) => record[key] !== undefined);
}

export function formValuesHaveUnsupportedVisualFields(values: PolicyFormValues): boolean {
  return (values.statements ?? []).some((statement) => {
    if ((statement.not_action?.length ?? 0) > 0 || (statement.not_resource?.length ?? 0) > 0) {
      return true;
    }
    if (statement.preservedFields && statementHasUnsupportedVisualFields(statement.preservedFields)) {
      return true;
    }
    return false;
  });
}

export function policyHasUnsupportedVisualFields(policy: Record<string, unknown>): boolean {
  const statements = policy.Statement;
  if (!Array.isArray(statements)) {
    return false;
  }
  return statements.some((statement) => {
    if (!statement || typeof statement !== 'object' || Array.isArray(statement)) {
      return false;
    }
    return statementHasUnsupportedVisualFields(statement as Record<string, unknown>);
  });
}

export function formatPolicyJson(policy: Record<string, unknown> | null, bucketName: string): string {
  const source = policy ?? formValuesToPolicy(policyToFormValues(null, bucketName));
  return JSON.stringify(source, null, 2);
}

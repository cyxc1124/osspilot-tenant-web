import { describe, expect, it } from 'vitest';
import {
  PolicyFormValidationError,
  allObjectsResourceArn,
  bucketResourceArn,
  buildObjectResourceArn,
  defaultStatement,
  formValuesHaveUnsupportedVisualFields,
  formValuesToPolicy,
  missingSuggestedResources,
  parsePrincipalFromForm,
  policyHasUnsupportedVisualFields,
  policyToFormValues,
  suggestResourcesForActions,
  type PolicyFormValues,
} from './policyForm';

describe('policyForm', () => {
  const bucketName = 'demo-bucket';

  it('builds bucket-scoped resource ARNs', () => {
    expect(bucketResourceArn(bucketName)).toBe('arn:aws:s3:::demo-bucket');
    expect(allObjectsResourceArn(bucketName)).toBe('arn:aws:s3:::demo-bucket/*');
    expect(buildObjectResourceArn(bucketName, 'photos/*')).toBe('arn:aws:s3:::demo-bucket/photos/*');
    expect(buildObjectResourceArn(bucketName, '')).toBe('arn:aws:s3:::demo-bucket');
  });

  it('suggests resources based on actions', () => {
    expect(suggestResourcesForActions(bucketName, ['s3:ListBucket'])).toEqual([
      'arn:aws:s3:::demo-bucket',
    ]);
    expect(suggestResourcesForActions(bucketName, ['s3:GetObject'])).toEqual([
      'arn:aws:s3:::demo-bucket/*',
    ]);
    expect(suggestResourcesForActions(bucketName, ['s3:ListBucket', 's3:GetObject'])).toEqual([
      'arn:aws:s3:::demo-bucket',
      'arn:aws:s3:::demo-bucket/*',
    ]);
    expect(missingSuggestedResources(bucketName, ['s3:GetObject'], [])).toEqual([
      'arn:aws:s3:::demo-bucket/*',
    ]);
  });

  it('round-trips a basic policy through form values', () => {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicRead',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::demo-bucket/*',
        },
      ],
    };
    const formValues = policyToFormValues(policy, bucketName);
    expect(formValuesToPolicy(formValues)).toEqual(policy);
  });

  it('preserves unsupported statement fields in round-trip', () => {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: '*',
          NotAction: 's3:GetObject',
          Resource: 'arn:aws:s3:::demo-bucket/*',
          Condition: { StringLike: { 'aws:Referer': ['https://example.com/*'] } },
        },
      ],
    };
    expect(policyHasUnsupportedVisualFields(policy)).toBe(true);
    const formValues = policyToFormValues(policy, bucketName);
    expect(formValuesHaveUnsupportedVisualFields(formValues)).toBe(true);
    expect(formValuesToPolicy(formValues)).toEqual(policy);
  });

  it('preserves top-level policy metadata in round-trip', () => {
    const policy = {
      Id: 'MyBucketPolicy',
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::demo-bucket/*',
        },
      ],
    };
    const formValues = policyToFormValues(policy, bucketName);
    expect(formValues.preservedPolicyFields).toEqual({ Id: 'MyBucketPolicy' });
    expect(formValuesToPolicy(formValues)).toEqual(policy);
  });

  it('registered-only form values drop preserved fields (antd pitfall)', () => {
    const policy = {
      Id: 'MyBucketPolicy',
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: '*',
          NotAction: 's3:GetObject',
          Resource: 'arn:aws:s3:::demo-bucket/*',
          Condition: { IpAddress: { 'aws:SourceIp': '203.0.113.0/24' } },
        },
      ],
    };
    const fullValues = policyToFormValues(policy, bucketName);
    const registeredOnly = {
      version: fullValues.version,
      statements: fullValues.statements.map(
        ({ sid, effect, principal, action, resource }) => ({
          sid,
          effect,
          principal,
          action,
          resource,
        }),
      ),
    };
    expect(formValuesToPolicy(registeredOnly)).not.toEqual(policy);
    expect(formValuesToPolicy(fullValues)).toEqual(policy);
  });

  it('parses principal values', () => {
    expect(parsePrincipalFromForm('*')).toBe('*');
    expect(parsePrincipalFromForm('{"AWS":"arn:aws:iam::123:root"}')).toEqual({
      AWS: 'arn:aws:iam::123:root',
    });
    expect(() => parsePrincipalFromForm('{')).toThrow(PolicyFormValidationError);
  });

  it('uses empty sid in default statement', () => {
    expect(defaultStatement(bucketName).sid).toBe('');
  });

  it('handles form values without statements array', () => {
    expect(formValuesHaveUnsupportedVisualFields({ version: '2012-10-17', statements: [] })).toBe(
      false,
    );
    expect(
      formValuesHaveUnsupportedVisualFields({ version: '2012-10-17' } as PolicyFormValues),
    ).toBe(false);
  });
});

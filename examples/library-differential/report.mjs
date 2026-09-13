const LIBRARIES = ['jose', 'jsonwebtoken', 'fast-jwt', 'PyJWT', 'Authlib', 'joserfc', 'python-jose'];
const PROFILES = ['default', 'configured'];

function expectationSatisfied(expectation, status) {
  if (expectation === 'accept') return status === 'accepted';
  if (expectation === 'reject') return status === 'rejected';
  if (expectation === 'reject-or-unsupported') return status === 'rejected' || status === 'unsupported';
  if (expectation === 'observe') return true;
  return false;
}

export function analyze(corpus, results) {
  const profiles = Object.fromEntries(PROFILES.map(profile => {
    const comparisons = corpus.cases.map(testCase => {
      const outcomes = Object.fromEntries(LIBRARIES.map(library => {
        const result = results.find(item =>
          item.case_id === testCase.id && item.library === library && item.profile === profile);
        return [library, result?.status || 'error'];
      }));
      const expectation = testCase.expectations[profile];
      return {
        case_id: testCase.profile_case_ids?.[profile] || testCase.id,
        token_case_id: testCase.id,
        expectation,
        outcomes,
        divergent: new Set(Object.values(outcomes)).size > 1,
        conforms: Object.values(outcomes).every(status => expectationSatisfied(expectation, status)),
      };
    });
    const baseline = comparisons.find(item => item.case_id === 'valid-baseline');
    return [profile, {
      control_all_accepted: baseline && Object.values(baseline.outcomes).every(status => status === 'accepted'),
      divergent_cases: comparisons.filter(item => item.divergent).map(item => item.case_id),
      nonconforming_cases: comparisons.filter(item => !item.conforms).map(item => item.case_id),
      comparisons,
    }];
  }));
  return { libraries: LIBRARIES, profiles };
}

function cell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function markdownReport(corpus, results, analysis) {
  const lines = [
    '# JWT Library Differential Report', '',
    `Generated: ${corpus.generated_at}`, '',
    `JWTForge: ${corpus.generator.url}`, '',
    'The default profile uses each library\'s key-only verification behavior. For PyJWT and python-jose, non-audience cases supply the known-good audience because JWTForge always emits aud; audience cases receive no audience in this profile.', '',
    'The configured profile fixes RS256, issuer, and audience through native library options. It also applies a common application-level jku allowlist before library verification; the harness never fetches a header URL.', '',
    'A divergence is a difference in normalized outcomes (accepted, rejected, or unsupported). It is an investigation lead, not evidence of a vulnerability.', '',
  ];

  for (const profile of PROFILES) {
    const profileAnalysis = analysis.profiles[profile];
    lines.push(
      `## ${profile[0].toUpperCase() + profile.slice(1)} profile`, '',
      `Signed control accepted by all libraries: **${profileAnalysis.control_all_accepted ? 'yes' : 'no'}**`, '',
      `| Case | Expected | ${analysis.libraries.join(' | ')} | Divergent |`,
      `|---|---|${analysis.libraries.map(() => '---').join('|')}|---|`,
    );
    for (const comparison of profileAnalysis.comparisons) {
      const outcomes = analysis.libraries.map(library => cell(comparison.outcomes[library])).join(' | ');
      lines.push(`| ${cell(comparison.case_id)} | ${cell(comparison.expectation)} | ${outcomes} | ${comparison.divergent ? 'yes' : 'no'} |`);
    }
    lines.push('');
  }

  lines.push('## Case details', '');
  for (const testCase of corpus.cases) {
    lines.push(`- **${testCase.id}** (${testCase.category}): ${testCase.description}`);
  }
  lines.push(
    '', '## Rejection details', '',
    '| Profile | Case | Library | Outcome | Error class | Message |',
    '|---|---|---|---|---|---|',
  );
  for (const result of results.filter(item => item.status !== 'accepted')) {
    lines.push(`| ${cell(result.profile)} | ${cell(result.experiment_id || result.case_id)} | ${cell(result.library)} | ${cell(result.status)} | ${cell(result.error_class || '')} | ${cell(result.message || '')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

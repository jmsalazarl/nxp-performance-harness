export function handleSummary(data: unknown, testType: string = "unknown") {
  return {
    [`reports/summary-${testType}.json`]: JSON.stringify(data, null, 2),
    stdout: JSON.stringify(
      {
        test_type: testType,
        metrics: Object.keys((data as any)?.metrics || {}),
      },
      null,
      2
    ),
  };
}

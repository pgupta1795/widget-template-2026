import { useMutation } from '@tanstack/react-query';
import { executeWafRequest, type ExecutorRequest, type ExecutorResponse } from '../executor/waf-executor';

export function useExecuteRequest() {
  return useMutation<ExecutorResponse, Error, ExecutorRequest>({
    mutationFn: (req) => executeWafRequest(req),
  });
}

<?php
/**
 * Request Input Validator Helper
 */

class Validator {
    private array $data;
    private array $errors = [];

    public function __construct(array $data) {
        $this->data = $data;
    }

    public static function make(array $data, array $rules): self {
        $validator = new self($data);
        $validator->validate($rules);
        return $validator;
    }

    public function validate(array $rules): void {
        foreach ($rules as $field => $ruleString) {
            $ruleList = explode('|', $ruleString);
            $val = $this->data[$field] ?? null;

            foreach ($ruleList as $rule) {
                $params = [];
                if (strpos($rule, ':') !== false) {
                    list($ruleName, $paramStr) = explode(':', $rule, 2);
                    $params = explode(',', $paramStr);
                } else {
                    $ruleName = $rule;
                }

                if ($ruleName === 'required' && ($val === null || trim((string)$val) === '')) {
                    $this->errors[$field][] = "The $field field is required.";
                    break;
                }

                if ($val !== null && trim((string)$val) !== '') {
                    if ($ruleName === 'email' && !filter_var($val, FILTER_VALIDATE_EMAIL)) {
                        $this->errors[$field][] = "The $field field must be a valid email address.";
                    }
                    if ($ruleName === 'numeric' && !is_numeric($val)) {
                        $this->errors[$field][] = "The $field field must be numeric.";
                    }
                    if ($ruleName === 'min' && strlen((string)$val) < (int)$params[0]) {
                        $this->errors[$field][] = "The $field field must be at least {$params[0]} characters.";
                    }
                    if ($ruleName === 'max' && strlen((string)$val) > (int)$params[0]) {
                        $this->errors[$field][] = "The $field field may not be greater than {$params[0]} characters.";
                    }
                    if ($ruleName === 'in' && !in_array($val, $params)) {
                        $this->errors[$field][] = "The $field field contains an invalid selection.";
                    }
                }
            }
        }
    }

    public function fails(): bool {
        return !empty($this->errors);
    }

    public function errors(): array {
        return $this->errors;
    }

    public function firstError(): string {
        foreach ($this->errors as $fieldErrors) {
            return $fieldErrors[0];
        }
        return 'Validation failed.';
    }
}

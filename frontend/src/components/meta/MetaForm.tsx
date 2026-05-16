"use client";

import { useState, useCallback, useEffect } from "react";
import { FormSectionRenderer, FieldSchema, FormSection } from "./SchemaField";
import { Loader2, AlertTriangle } from "lucide-react";
import { draftApi } from "@/services/api";

export interface FormSchema {
  entityType: "campaign" | "adSet" | "ad";
  sections: FormSection[];
  context: {
    objective?: string;
    buyingType?: string;
    isCBO?: boolean;
    destinationType?: string;
  };
}

interface MetaFormProps {
  entityType: "campaign" | "adSet" | "ad";
  initialValues: Record<string, any>;
  context?: {
    objective?: string;
    buyingType?: string;
    isCBO?: boolean;
    destinationType?: string;
  };
  onChange: (values: Record<string, any>) => void;
  onValidationChange?: (errors: string[]) => void;
  compact?: boolean;
  schema?: FormSchema;
}

export function MetaForm({
  entityType,
  initialValues,
  context,
  onChange,
  onValidationChange,
  compact,
  schema: externalSchema,
}: MetaFormProps) {
  const [schema, setSchema] = useState<FormSchema | null>(externalSchema || null);
  const [loading, setLoading] = useState(!externalSchema);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, any>>(initialValues);

  useEffect(() => {
    if (externalSchema) {
      setSchema(externalSchema);
      setLoading(false);
      return;
    }
    fetchSchema();
  }, [entityType, context?.objective, context?.isCBO]);

  const fetchSchema = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await draftApi.getFormSchema(entityType, context);
      setSchema(resp.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load form schema");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = useCallback(
    (path: string, value: any) => {
      setValues((prev) => {
        const next = setNestedValue({ ...prev }, path, value);
        onChange(next);
        return next;
      });
    },
    [onChange],
  );

  const handleInvalidate = useCallback(
    (field: string) => {
      setValues((prev) => {
        const next = { ...prev };
        delete next[field];
        onChange(next);
        return next;
      });
    },
    [onChange],
  );

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        <span className="text-xs text-gray-500">Loading form schema...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-red-400">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-xs">{error}</span>
      </div>
    );
  }

  if (!schema) return null;

  return (
    <div className="space-y-3">
      {schema.sections.map((section) => (
        <FormSectionRenderer
          key={section.id}
          section={section}
          values={values}
          onChange={handleFieldChange}
          onInvalidate={handleInvalidate}
          compact={compact}
        />
      ))}
    </div>
  );
}

// ─── Utility ───

function setNestedValue(obj: Record<string, any>, path: string, value: any): Record<string, any> {
  const parts = path.split(".");
  if (parts.length === 1) {
    if (value === undefined) {
      delete obj[parts[0]];
    } else {
      obj[parts[0]] = value;
    }
    return obj;
  }

  const [head, ...rest] = parts;
  if (!obj[head] || typeof obj[head] !== "object") {
    obj[head] = {};
  }
  obj[head] = setNestedValue({ ...obj[head] }, rest.join("."), value);
  return obj;
}

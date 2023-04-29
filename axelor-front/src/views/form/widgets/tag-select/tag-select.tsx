import { useAtom, useAtomValue } from "jotai";
import { MouseEvent, useCallback, useMemo } from "react";
import { Box, Select, SelectProps } from "@axelor/ui";

import { useCompletion, useEditor } from "@/hooks/use-relation";
import { DataRecord } from "@/services/client/data.types";

import { FieldContainer, FieldProps } from "../../builder";
import { Chip } from "../selection";
import { Schema } from "@/services/client/meta.types";

export function TagSelectComponent({
  schema,
  ...props
}: { schema: Schema } & SelectProps) {
  const { targetName } = schema;
  const components = useMemo(
    () => ({
      MultiValue: (props: any) => {
        const { data, removeProps } = props;
        return (
          <Box me={1}>
            <Chip
              color={"indigo"}
              title={data?.[targetName]}
              onRemove={removeProps.onClick}
            />
          </Box>
        );
      },
    }),
    [targetName]
  );

  return (
    <Select
      isMulti
      optionLabel={targetName}
      optionValue={"id"}
      components={components}
      {...props}
    />
  );
}

export function TagSelect(props: FieldProps<DataRecord[]>) {
  const { schema, valueAtom, widgetAtom, readonly } = props;
  const {
    uid,
    target,
    targetName,
    targetSearch,
    placeholder,
    showTitle = true,
  } = schema;

  const {
    attrs: { title },
  } = useAtomValue(widgetAtom);
  const [value, setValue] = useAtom(valueAtom);

  const showEditor = useEditor();

  const search = useCompletion({
    target,
    targetName,
    targetSearch,
  });

  const handleChange = (value: any) => {
    setValue(value);
  };

  const handleEdit = useCallback(
    async (value: DataRecord, readonly = false) => {
      showEditor({
        title: title ?? "",
        model: target,
        record: value,
        readonly,
      });
    },
    [showEditor, target, title]
  );

  const handleView = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, value: DataRecord) => {
      e.preventDefault();
      return handleEdit(value, true);
    },
    [handleEdit]
  );

  const handleCompletion = useCallback(
    async (value: string) => {
      const res = await search(value);
      const { records } = res;
      return records;
    },
    [search]
  );

  return (
    <FieldContainer>
      {showTitle && <label htmlFor={uid}>{title}</label>}
      {readonly ? (
        <Box d="flex" flexWrap="wrap">
          {(value || []).map((val) => (
            <Box
              m={1}
              key={val?.id}
              as="a"
              href="#"
              onClick={(e) => handleView(e, val)}
            >
              <Chip title={val[targetName]} color={"indigo"} />
            </Box>
          ))}
        </Box>
      ) : (
        <TagSelectComponent
          schema={schema}
          onChange={handleChange}
          value={value}
          fetchOptions={handleCompletion}
          placeholder={placeholder}
        />
      )}
    </FieldContainer>
  );
}

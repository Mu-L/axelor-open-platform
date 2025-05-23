import { useAtom, useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import { ChangeEvent, useMemo, useRef } from "react";

import { clsx, Box, Button, ButtonGroup } from "@axelor/ui";
import { MaterialIcon } from "@axelor/ui/icons/material-icon";

import { DataStore } from "@/services/client/data-store";
import { DataRecord } from "@/services/client/data.types";
import { download } from "@/utils/download";

import { FieldControl, FieldProps } from "../../builder";
import {
  META_FILE_MODEL,
  makeImageURL,
  validateFileSize,
} from "../image/utils";

import styles from "./binary-link.module.scss";
import { i18n } from "@/services/client/i18n.ts";

export function BinaryLink(props: FieldProps<DataRecord | undefined | null>) {
  const { schema, readonly, invalid, formAtom, widgetAtom, valueAtom } = props;
  const { name, accept, $json } = schema;

  const [value, setValue] = useAtom(valueAtom);
  const { attrs } = useAtomValue(widgetAtom);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const recordAtom = useMemo(
    () =>
      selectAtom(formAtom, (x) => {
        const { record } = x;
        return $json ? record?.$record : record;
      }),
    [formAtom, $json],
  );

  const parentId = useAtomValue(
    useMemo(() => selectAtom(recordAtom, (x) => x.id), [recordAtom]),
  );

  const parentVersion = useAtomValue(
    useMemo(() => selectAtom(recordAtom, (x) => x.version), [recordAtom]),
  );

  const parentModel = useAtomValue(
    useMemo(() => selectAtom(formAtom, (x) => x.model), [formAtom]),
  );

  const parent = {
    id: parentId,
    version: parentVersion,
    _model: parentModel,
  } as DataRecord;

  function handleUpload() {
    const input = inputRef.current;
    input && input.click();
  }

  function handleDownload() {
    const { target, name } = schema;
    const fileURL = makeImageURL(value, target, name, parent, true);
    download(fileURL, value?.fileName || name);
  }

  function handleRemove() {
    const input = inputRef.current;
    input && (input.value = "");
    setValue(null, true);
  }

  async function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e?.target?.files?.[0];

    inputRef.current && (inputRef.current.value = "");

    if (file && validateFileSize(file)) {
      const dataStore = new DataStore(META_FILE_MODEL);
      const metaFile = await dataStore.save({
        id: value?.id,
        version: value?.version ?? value?.$version,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        $upload: { file },
      });
      if (metaFile.id) {
        setValue(metaFile, true, value?.id == null);
      }
    }
  }

  const text = value?.fileName;

  if (attrs.hidden) return null;

  return (
    <FieldControl {...props}>
      <Box d="flex">
        {!readonly && (
          <>
            <form ref={formRef}>
              <Box
                as={"input"}
                onChange={handleInputChange}
                type="file"
                ref={inputRef}
                d="none"
                accept={accept}
              />
            </form>
            <Box
              d="flex"
              alignItems="center"
              className={clsx(styles.container, { [styles.invalid]: invalid })}
            >
              <ButtonGroup border className={styles.btns}>
                <Button
                  variant="light"
                  d="flex"
                  alignItems="center"
                  title={i18n.get("Upload")}
                  onClick={handleUpload}
                >
                  <MaterialIcon icon="upload" />
                </Button>
                <Button
                  variant="light"
                  d="flex"
                  alignItems="center"
                  title={i18n.get("Remove")}
                  onClick={handleRemove}
                >
                  <MaterialIcon icon="close" />
                </Button>
              </ButtonGroup>
            </Box>
          </>
        )}
        {text && (
          <Button
            textAlign="start"
            variant="link"
            title={name}
            onClick={() => handleDownload()}
          >
            {text}
          </Button>
        )}
      </Box>
    </FieldControl>
  );
}

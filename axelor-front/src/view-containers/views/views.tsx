import { atom, useAtomValue, useSetAtom } from "jotai";
import { ScopeProvider } from "jotai-molecules";
import { selectAtom } from "jotai/utils";
import { focusAtom } from "jotai-optics";
import { memo, useEffect, useMemo } from "react";

import { Box, Fade } from "@axelor/ui";

import { Loader } from "@/components/loader/loader";
import { useAsync } from "@/hooks/use-async";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { Tab } from "@/hooks/use-tabs";
import { DataStore } from "@/services/client/data-store";
import { filters as fetchFilters } from "@/services/client/meta";
import { findView } from "@/services/client/meta-cache";
import {
  AdvancedSearchAtom,
  Property,
  SearchFilter,
  SearchFilters,
} from "@/services/client/meta.types";
import { toCamelCase, toKebabCase } from "@/utils/names";
import { findFields } from "@/services/client/meta-cache";

import { ViewScope } from "./scope";
import { AdvancedSearchState } from "../advance-search/types";
import { prepareAdvanceSearchQuery } from "../advance-search/utils";

async function loadComp(viewType: string) {
  const type = toKebabCase(viewType);
  const name = toCamelCase(type);
  const { [name]: Comp } = await import(`../../views/${type}/index.ts`);
  return Comp as React.ElementType;
}

async function loadView(props: {
  type: string;
  name?: string;
  model?: string;
  resource?: string;
}) {
  const { type } = props;
  const meta = await findView(props);
  const Comp = await loadComp(type);
  return { meta, type, Comp };
}

function ViewContainer({
  tab,
  view,
  searchAtom,
  dataStore,
}: {
  tab: Tab;
  view: { name?: string; type: string };
  searchAtom?: AdvancedSearchAtom;
  dataStore?: DataStore;
}) {
  const { model } = tab.action;
  const { state, data } = useAsync(
    async () => loadView({ model, ...view }),
    [model, view]
  );

  const viewData = data?.meta?.view;
  const viewTitle = (view.type === "form" && viewData?.title) || tab.title;
  const viewName = viewData?.name;

  const setTabTitle = useSetAtom(
    useMemo(
      () => focusAtom(tab.state, (state) => state.prop("title")),
      [tab.state]
    )
  );

  const setTabName = useSetAtom(
    useMemo(
      () => focusAtom(tab.state, (state) => state.prop("name")),
      [tab.state]
    )
  );

  useEffect(() => {
    viewTitle && setTabTitle(viewTitle);
    setTabName(viewName);
  }, [viewTitle, viewName, setTabTitle, setTabName]);

  if (state === "loading" || data?.type !== view.type) {
    return <Loader />;
  }

  const { meta, Comp } = data;

  if (Comp) {
    return (
      <Fade in={true} timeout={400} mountOnEnter>
        <Box
          data-view-id={tab.id}
          d="flex"
          flex={1}
          style={{ minWidth: 0, minHeight: 0 }}
        >
          <Comp meta={meta} dataStore={dataStore} searchAtom={searchAtom} />
        </Box>
      </Fade>
    );
  }

  return null;
}

function ViewPane({
  tab,
  dataStore,
  searchAtom,
}: {
  tab: Tab;
  dataStore?: DataStore;
  searchAtom?: AdvancedSearchAtom;
}) {
  const {
    action: { views = [] },
  } = tab;
  const typeAtom = useMemo(() => {
    return selectAtom(tab.state, (x) => x.type);
  }, [tab.state]);

  const type = useAtomValue(typeAtom);
  const view = useMemo(() => views.find((x) => x.type === type), [type, views]);

  if (view) {
    return (
      <ScopeProvider scope={ViewScope} value={tab}>
        <ViewContainer
          view={view}
          tab={tab}
          dataStore={dataStore}
          searchAtom={searchAtom}
        />
      </ScopeProvider>
    );
  }

  return null;
}

const DataViews = memo(function DataViews({
  tab,
  model,
}: {
  tab: Tab;
  model: string;
}) {
  const {
    action: { name: actionName, domain, context, params },
  } = tab;
  const limit = +params?.limit || 0;

  const dataStore = new DataStore(model, {
    ...(limit && { limit }),
    filter: {
      _domain: domain,
      _domainContext: context,
    },
  });

  // advanced search
  const searchAtom = useMemo<AdvancedSearchAtom>(
    () =>
      atom<AdvancedSearchState>({
        search: {},
        editor: { criteria: [] },
      }),
    []
  );
  const setSearchState = useSetAtom(searchAtom);

  const filterName = params?.["search-filters"];
  const defaultSearchFilter = params?.["default-search-filters"];
  const dashlet = actionName?.startsWith("$dashlet");
  const dashletSearch = params?.["dashlet.canSearch"];
  const hasAdvanceSearch = dashlet ? dashletSearch : true;

  useAsyncEffect(async () => {
    if (!hasAdvanceSearch) return;
    const { fields = {}, jsonFields = {} } = await findFields(
      model,
      context?.jsonModel
    );
    const dashletActionName =
      dashlet && context?._domainAction ? `act:${context._domainAction}` : "";
    const filters = await fetchFilters(
      filterName || dashletActionName || `act:${actionName}`
    );

    setSearchState((state) => ({
      ...state,
      filters,
      fields,
      jsonFields,
    }));
  }, [filterName, actionName, hasAdvanceSearch]);

  useAsyncEffect(async () => {
    if (!hasAdvanceSearch) return;
    const selectedDomains: string[] = (defaultSearchFilter || "")?.split(",");
    let domains: SearchFilter[] = [];
    let items: Property[] = [];

    if (filterName) {
      const res = await findView<SearchFilters>({
        name: filterName,
        type: "search-filters",
        model,
      });
      const fields = res?.fields || {};
      items = (res?.view?.items || []).map((item) => {
        const field = fields[item.name || ""] || {};
        return {
          ...field,
          ...item,
          type: field.type ?? "STRING",
        } as Property;
      });
      domains = (res?.view?.filters || []).map((d) => ({
        ...d,
        checked: selectedDomains.includes(d.name!),
      }));
    }

    setSearchState((_state) => {
      const state = { ..._state, domains, items };
      return { ...state, ...prepareAdvanceSearchQuery(state) };
    });
  }, [
    model,
    hasAdvanceSearch,
    defaultSearchFilter,
    filterName,
    setSearchState,
  ]);

  return <ViewPane tab={tab} dataStore={dataStore} searchAtom={searchAtom} />;
});

export const Views = memo(function Views({ tab }: { tab: Tab }) {
  const model = tab.action.model;
  return model ? <DataViews tab={tab} model={model} /> : <ViewPane tab={tab} />;
});

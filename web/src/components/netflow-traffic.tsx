import { isModelFeatureFlag, ModelFeatureFlag, useResolvedExtensions } from '@openshift-console/dynamic-plugin-sdk';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  OverflowMenuItem,
  PageSection,
  Text,
  TextVariants,
  Tooltip
} from '@patternfly/react-core';
import { ColumnsIcon, SyncAltIcon } from '@patternfly/react-icons';
import * as _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { Record } from '../api/ipfix';
import { getFlows } from '../api/routes';
import { QueryOptions } from '../model/query-options';
import { Column, getDefaultColumns } from '../utils/columns';
import { TimeRange } from '../utils/datetime';
import { getHTTPErrorDetails } from '../utils/errors';
import { Filter } from '../utils/filters';
import {
  LOCAL_STORAGE_COLS_KEY,
  LOCAL_STORAGE_REFRESH_KEY,
  LOCAL_STORAGE_SIZE_KEY,
  useLocalStorage
} from '../utils/local-storage-hook';
import { usePoll } from '../utils/poll-hook';
import {
  buildQueryArguments,
  getFiltersFromURL,
  getQueryOptionsFromURL,
  getRangeFromURL,
  NETFLOW_TRAFFIC_PATH,
  QueryArguments,
  removeURLQueryArguments,
  setURLQueryArguments
} from '../utils/router';
import { ColumnsModal } from './columns-modal';
import DisplayDropdown, { Size } from './display-dropdown';
import { FiltersToolbar } from './filters-toolbar';
import { RecordPanel } from './netflow-record/record-panel';
import NetflowTable from './netflow-table/netflow-table';
import './netflow-traffic.css';
import { RefreshDropdown } from './refresh-dropdown';
import TimeRangeDropdown from './time-range-dropdown';
import TimeRangeModal from './time-range-modal';

export const NetflowTraffic: React.FC<{
  forcedFilters?: Filter[];
}> = ({ forcedFilters }) => {
  const { push } = useHistory();
  const [extensions] = useResolvedExtensions<ModelFeatureFlag>(isModelFeatureFlag);
  const [loading, setLoading] = React.useState(true);
  const [flows, setFlows] = React.useState<Record[]>([]);
  const [error, setError] = React.useState<string | undefined>();
  const [size, setSize] = useLocalStorage<Size>(LOCAL_STORAGE_SIZE_KEY, 'm');
  const [isTRModalOpen, setTRModalOpen] = React.useState(false);
  const [isColModalOpen, setColModalOpen] = React.useState(false);
  const { t } = useTranslation('plugin__network-observability-plugin');

  //TODO: create a number range filter type for Packets & Bytes
  const [columns, setColumns] = useLocalStorage<Column[]>(LOCAL_STORAGE_COLS_KEY, getDefaultColumns(t), {
    id: 'id',
    criteria: 'isSelected'
  });
  const [filters, setFilters] = React.useState<Filter[]>(getFiltersFromURL(columns));
  const [range, setRange] = React.useState<number | TimeRange>(getRangeFromURL());
  const [queryOptions, setQueryOptions] = React.useState<QueryOptions>(getQueryOptionsFromURL());
  const [interval, setInterval] = useLocalStorage<number | undefined>(LOCAL_STORAGE_REFRESH_KEY);
  const isInit = React.useRef(true);
  const [selectedRecord, setSelectedRecord] = React.useState<Record | undefined>(undefined);

  const onSelect = (record?: Record) => {
    setTRModalOpen(false);
    setColModalOpen(false);
    setSelectedRecord(record);
  };

  const tick = React.useCallback(
    (queryArgs?: QueryArguments) => {
      const qa = queryArgs ?? buildQueryArguments(forcedFilters ? forcedFilters : filters, range, queryOptions);
      setLoading(true);
      setError(undefined);
      getFlows(qa)
        .then(setFlows)
        .catch(err => {
          setFlows([]);
          const errorMessage = getHTTPErrorDetails(err);
          setError(errorMessage);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [filters, forcedFilters, range, queryOptions]
  );

  // Rewrite URL params on state change and tick
  React.useEffect(() => {
    // Skip on init if forcedFilters not set
    if (isInit.current) {
      isInit.current = false;
      if (!forcedFilters) {
        return;
      }
    }
    const qa = buildQueryArguments(forcedFilters ? forcedFilters : filters, range, queryOptions);
    setURLQueryArguments(qa);
    tick(qa);
  }, [filters, forcedFilters, range, queryOptions, tick]);

  usePoll(tick, interval);

  // updates table filters and clears up the table for proper visualization of the
  // updating process
  const updateTableFilters = (f: Filter[]) => {
    setFilters(f);
    setFlows([]);
  };

  const clearFilters = () => {
    if (_.isEmpty(forcedFilters)) {
      if (!_.isEmpty(filters)) {
        removeURLQueryArguments(filters!.map(f => f.colId));
      }
      updateTableFilters([]);
    } else {
      push(NETFLOW_TRAFFIC_PATH);
    }
  };

  const coActions = (
    <div className="co-actions">
      <TimeRangeDropdown
        id="time-range-dropdown"
        range={typeof range === 'number' ? range : undefined}
        setRange={setRange}
        openCustomModal={() => setTRModalOpen(true)}
      />
      <RefreshDropdown id="refresh-dropdown" interval={interval} setInterval={setInterval} />
      <Button
        id="refresh-button"
        className="co-action-refresh-button"
        variant="primary"
        onClick={() => tick()}
        icon={<SyncAltIcon style={{ animation: `spin ${loading ? 1 : 0}s linear infinite` }} />}
      />
    </div>
  );

  //update data on filters changes
  React.useEffect(() => {
    setTRModalOpen(false);
  }, [range]);

  return !_.isEmpty(extensions) ? (
    <Drawer id="pageDrawer" isExpanded={selectedRecord !== undefined}>
      <DrawerContent
        panelContent={
          <RecordPanel
            id="recordPanel"
            record={selectedRecord}
            columns={columns}
            filters={filters}
            range={range}
            options={queryOptions}
            setFilters={setFilters}
            setRange={setRange}
            setQueryOptions={setQueryOptions}
            onClose={() => onSelect(undefined)}
          />
        }
      >
        <DrawerContentBody>
          <PageSection id="pageSection">
            {
              //display title only if forced filters is not set
              _.isEmpty(forcedFilters) && (
                <Text component={TextVariants.h1} className="co-m-pane__heading">
                  <span>{t('Network Traffic')}</span>
                  {coActions}
                </Text>
              )
            }
            <FiltersToolbar
              id="filter-toolbar"
              columns={columns}
              filters={filters}
              setFilters={updateTableFilters}
              clearFilters={clearFilters}
              queryOptions={queryOptions}
              setQueryOptions={setQueryOptions}
              forcedFilters={forcedFilters}
              //show actions next to filters if title is hidden
              actions={!_.isEmpty(forcedFilters) ? coActions : null}
            >
              <OverflowMenuItem>
                <Tooltip content={t('Manage columns')}>
                  <Button
                    id="manage-columns-button"
                    variant="plain"
                    onClick={() => setColModalOpen(true)}
                    aria-label={t('Column management')}
                  >
                    <ColumnsIcon color="#6A6E73" />
                  </Button>
                </Tooltip>
              </OverflowMenuItem>
              <DisplayDropdown id="display-dropdown" setSize={setSize} />
            </FiltersToolbar>
            <NetflowTable
              loading={loading}
              error={error}
              flows={flows}
              selectedRecord={selectedRecord}
              size={size}
              onSelect={onSelect}
              clearFilters={clearFilters}
              columns={columns.filter(col => col.isSelected)}
            />
            <TimeRangeModal
              id="time-range-modal"
              isModalOpen={isTRModalOpen}
              setModalOpen={setTRModalOpen}
              range={typeof range === 'object' ? range : undefined}
              setRange={setRange}
            />
            <ColumnsModal
              id="columns-modal"
              isModalOpen={isColModalOpen}
              setModalOpen={setColModalOpen}
              columns={columns}
              setColumns={setColumns}
            />
          </PageSection>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  ) : null;
};

export default NetflowTraffic;

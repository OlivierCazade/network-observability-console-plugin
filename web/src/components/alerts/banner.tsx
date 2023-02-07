import * as React from 'react';
import {
  Alert,
  AlertActionLink,
  AlertActionCloseButton,
  TextContent,
  Text,
  TextVariants
} from '@patternfly/react-core';
import './banner.css';
import { AlertsRule } from '../../api/alert';
import { useHistory } from 'react-router-dom';

export const AlertBanner: React.FC<{
  rule: AlertsRule;
  onDelete: () => void;
}> = ({ rule, onDelete }) => {
  let history = useHistory();
  const routeChange = () => {
    let path = `/monitoring/alerts/${rule.id}?alertname=${rule.name}&namespace=${rule.labels.namespace}&severity=${rule.labels.severity}`;
    history.push(path);
  };
  return (
    <div className="netobserv-alert">
      <Alert
        title={rule.name}
        isInline={true}
        variant="danger"
        actionClose={<AlertActionCloseButton onClose={onDelete} />}
        actionLinks={
          <React.Fragment>
            <AlertActionLink onClick={routeChange}>View alert details</AlertActionLink>
          </React.Fragment>
        }
      >
        <TextContent>
          <Text component={TextVariants.p}>{!!rule.annotations.description ? rule.annotations.description : ''}</Text>
        </TextContent>
      </Alert>
    </div>
  );
};

export default AlertBanner;

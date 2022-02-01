import * as React from 'react';
import { shallow } from 'enzyme';
import { Button } from '@patternfly/react-core';
import RecordField, { RecordFieldFilter } from '../record-field';
import { ColumnsSample } from '../../__tests-data__/columns';
import { FlowsSample } from '../../__tests-data__/flows';
import { Size } from '../../display-dropdown';

describe('<RecordField />', () => {
  const filterMock: RecordFieldFilter = {
    onClick: jest.fn(),
    isDelete: false
  };
  const mocks = {
    size: 'm' as Size
  };
  it('should render component', async () => {
    const wrapper = shallow(<RecordField flow={FlowsSample[0]} column={ColumnsSample[0]} {...mocks} />);
    expect(wrapper.find(RecordField)).toBeTruthy();
    expect(wrapper.find('.record-field-content')).toHaveLength(1);
    expect(wrapper.find('.m')).toHaveLength(1);
  });
  it('should filter', async () => {
    const wrapper = shallow(
      <RecordField flow={FlowsSample[0]} column={ColumnsSample[0]} filter={filterMock} {...mocks} />
    );
    expect(wrapper.find(RecordField)).toBeTruthy();
    expect(wrapper.find('.record-field-flex-container')).toHaveLength(1);
    expect(wrapper.find('.record-field-flex')).toHaveLength(1);
    const button = wrapper.find(Button);
    expect(button).toHaveLength(1);
    button.simulate('click');
    expect(filterMock.onClick).toHaveBeenCalledWith(ColumnsSample[0], filterMock.isDelete);
  });
});

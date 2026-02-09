import React from 'react';
import { Dropdown } from 'reactstrap';
import { useAsync } from '../../hooks/useAsync';
import WatchPartyInputLink from './WatchPartyInputLink';

const LinksDropdown = () => {
    // ... other code ...

    const renderLinks = () => {
        // ... other code ...

        return (
            <Dropdown>
                {/* Render other links */}
                {/* WatchPartyInputLink is removed */}
            </Dropdown>
        );
    };

    return (
        <div>
            { renderLinks() }
        </div>
    );
};

export default LinksDropdown;
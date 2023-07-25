import { print } from 'graphql';
import gql from 'graphql-tag';

import { ChannelNotFoundError } from '../../channel/errors';
import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { withErrorHandlingAsync } from '../client';
import {
  PageInfo,
  UpdateChannelBasicInfoFragment,
  ViewUpdateChannelOnAppQuery,
  ViewUpdateChannelOnAppQueryVariables,
  ViewUpdateChannelsOnAppQuery,
  ViewUpdateChannelsOnAppQueryVariables,
  ViewUpdateChannelsPaginatedOnAppQuery,
  ViewUpdateChannelsPaginatedOnAppQueryVariables,
} from '../generated';
import { UpdateBranchWithCurrentGroupFragmentNode } from '../types/UpdateBranchWithCurrentUpdate';
import { UpdateChannelBasicInfoFragmentNode } from '../types/UpdateChannelBasicInfo';

type ViewUpdateChannelsOnAppObject = NonNullable<
  ViewUpdateChannelsOnAppQuery['app']['byId']['updateChannels']
>[number];

type UpdateChannelByNameObject = NonNullable<
  ViewUpdateChannelOnAppQuery['app']['byId']['updateChannelByName']
>;

// these types should have the same fields
export type UpdateChannelObject = ViewUpdateChannelsOnAppObject & UpdateChannelByNameObject;

export const ChannelQuery = {
  async viewUpdateChannelAsync(
    graphqlClient: ExpoGraphqlClient,
    { appId, channelName }: ViewUpdateChannelOnAppQueryVariables
  ): Promise<UpdateChannelByNameObject> {
    const response = await withErrorHandlingAsync(
      graphqlClient
        .query<ViewUpdateChannelOnAppQuery, ViewUpdateChannelOnAppQueryVariables>(
          gql`
            query ViewUpdateChannelOnApp($appId: String!, $channelName: String!) {
              app {
                byId(appId: $appId) {
                  id
                  updateChannelByName(name: $channelName) {
                    id
                    name
                    createdAt
                    branchMapping
                    updateBranches(offset: 0, limit: 5) {
                      id
                      ...UpdateBranchWithCurrentGroupFragment
                    }
                  }
                }
              }
            }
            ${print(UpdateBranchWithCurrentGroupFragmentNode)}
          `,
          { appId, channelName },
          { additionalTypenames: ['UpdateChannel', 'UpdateBranch', 'Update'] }
        )
        .toPromise()
    );

    const { updateChannelByName } = response.app.byId;
    if (!updateChannelByName) {
      throw new ChannelNotFoundError(`Could not find channel with the name ${channelName}`);
    }

    return updateChannelByName;
  },
  async viewUpdateChannelsOnAppAsync(
    graphqlClient: ExpoGraphqlClient,
    { appId, limit, offset }: ViewUpdateChannelsOnAppQueryVariables
  ): Promise<UpdateChannelObject[]> {
    const response = await withErrorHandlingAsync(
      graphqlClient
        .query<ViewUpdateChannelsOnAppQuery, ViewUpdateChannelsOnAppQueryVariables>(
          gql`
            query ViewUpdateChannelsOnApp($appId: String!, $offset: Int!, $limit: Int!) {
              app {
                byId(appId: $appId) {
                  id
                  updateChannels(offset: $offset, limit: $limit) {
                    id
                    name
                    createdAt
                    branchMapping
                    updateBranches(offset: 0, limit: 5) {
                      id
                      ...UpdateBranchWithCurrentGroupFragment
                    }
                  }
                }
              }
            }
            ${print(UpdateBranchWithCurrentGroupFragmentNode)}
          `,
          { appId, offset, limit },
          { additionalTypenames: ['UpdateChannel', 'UpdateBranch', 'Update'] }
        )
        .toPromise()
    );
    const { updateChannels } = response.app.byId;

    if (!updateChannels) {
      throw new Error(`Could not find channels on project with id ${appId}`);
    }

    return updateChannels;
  },
  async viewUpdateChannelsBasicInfoPaginatedOnAppAsync(
    graphqlClient: ExpoGraphqlClient,
    { appId, first, after }: ViewUpdateChannelsPaginatedOnAppQueryVariables
  ): Promise<[UpdateChannelBasicInfoFragment[], PageInfo]> {
    const response = await withErrorHandlingAsync(
      graphqlClient
        .query<
          ViewUpdateChannelsPaginatedOnAppQuery,
          ViewUpdateChannelsPaginatedOnAppQueryVariables
        >(
          gql`
            query ViewUpdateChannelsPaginatedOnApp($appId: String!, $first: Int, $after: String) {
              app {
                byId(appId: $appId) {
                  id
                  channelsPaginated(first: $first, after: $after) {
                    edges {
                      node {
                        id
                        ...UpdateChannelBasicInfoFragment
                      }
                    }
                    pageInfo {
                      hasNextPage
                      hasPreviousPage
                      startCursor
                      endCursor
                    }
                  }
                }
              }
            }
            ${print(UpdateChannelBasicInfoFragmentNode)}
          `,
          { appId, first, after },
          { additionalTypenames: ['UpdateChannel', 'UpdateBranch', 'Update'] }
        )
        .toPromise()
    );
    const { channelsPaginated } = response.app.byId;

    if (!channelsPaginated) {
      throw new Error(`Could not find channels on project with id ${appId}`);
    }

    return [channelsPaginated.edges.map(edge => edge.node) ?? [], channelsPaginated.pageInfo];
  },
};

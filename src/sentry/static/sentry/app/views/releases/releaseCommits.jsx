import React from 'react';

import LoadingIndicator from '../../components/loadingIndicator';
import LoadingError from '../../components/loadingError';
import Avatar from '../../components/avatar';
import TimeSince from '../../components/timeSince';
import DropdownLink from '../../components/dropdownLink';
import MenuItem from '../../components/menuItem';
import ApiMixin from '../../mixins/apiMixin';

import {t} from '../../locale';

const CommitLink = React.createClass({
  propTypes: {
    commitId: React.PropTypes.string,
    repository: React.PropTypes.object
  },

  getCommitUrl() {
    // TODO(jess): move this to plugins
    if (this.props.repository.provider.id === 'github') {
      return this.props.repository.url + '/commit/' + this.props.commitId;
    }
  },

  render() {
    let commitUrl = this.getCommitUrl();
    let shortId = this.props.commitId.slice(0, 7);

    return commitUrl
      ? <a className="btn btn-default btn-sm" href={commitUrl} target="_blank">
          <span className={'icon-mark-' + this.props.repository.provider.id} />
          &nbsp;
          {' '}
          {shortId}
        </a>
      : <span>{shortId}</span>;
  }
});

const ReleaseCommit = React.createClass({
  propTypes: {
    commitId: React.PropTypes.string,
    commitMessage: React.PropTypes.string,
    commitDateCreated: React.PropTypes.string,
    author: React.PropTypes.object,
    repository: React.PropTypes.object
  },

  render() {
    return (
      <li className="list-group-item" key={this.props.commitId}>
        <div className="row row-center-vertically">
          <div className="col-xs-8 list-group-avatar">
            <Avatar user={this.props.author} />
            <h5>{this.props.commitMessage || t('No message provided')}</h5>
            <p>
              <strong>{this.props.author.name || t('Unknown author')}</strong>
              {' '}
              committed
              {' '}
              <TimeSince date={this.props.commitDateCreated} />
            </p>
          </div>
          <div className="col-xs-2">
            <span className="repo-label">{this.props.repository.name}</span>
          </div>
          <div className="col-xs-2 align-right">
            <CommitLink
              commitId={this.props.commitId}
              repository={this.props.repository}
            />
          </div>
        </div>
      </li>
    );
  }
});

const ReleaseCommits = React.createClass({
  mixins: [ApiMixin],

  getInitialState() {
    return {
      loading: true,
      error: false,
      commitList: [],
      activeRepo: null,
      title: 'All Repositories'
    };
  },

  componentDidMount() {
    let {orgId, projectId, version} = this.props.params;

    let path = `/projects/${orgId}/${projectId}/releases/${encodeURIComponent(version)}/commits/`;
    this.api.request(path, {
      method: 'GET',
      data: this.props.location.query,
      success: (data, _, jqXHR) => {
        this.setState({
          error: false,
          loading: false,
          commitList: data,
          pageLinks: jqXHR.getResponseHeader('Link')
        });
      },
      error: () => {
        this.setState({
          error: true,
          loading: false
        });
      }
    });
  },

  emptyState() {
    return (
      <div className="box empty-stream m-y-0">
        <span className="icon icon-exclamation" />
        <p>There are no commits associated with this release.</p>
        {/* Todo: Should we link to repo settings from here?  */}
      </div>
    );
  },

  setActiveRepo(repo) {
    this.setState({
      activeRepo: repo,
      title: repo || 'All Repositories'
    });
  },

  renderCommitsForRepo() {
    let {activeRepo, commitList} = this.state;
    let commitsByRepository = commitList.reduce(function(cbr, commit) {
      let {repository} = commit;
      if (!cbr.hasOwnProperty(repository.name)) {
        cbr[repository.name] = [];
      }

      cbr[repository.name].push(commit);
      return cbr;
    }, {});
    let activeCommits = commitsByRepository[activeRepo];
    return (
      <ul className="list-group list-group-lg commit-list">
        {activeCommits.map(commit => {
          return (
            <ReleaseCommit
              key={commit.id}
              commitId={commit.id}
              author={commit.author}
              commitMessage={commit.message}
              commitDateCreated={commit.dateCreated}
              repository={commit.repository}
            />
          );
        })}
      </ul>
    );
  },

  render() {
    if (this.state.loading) return <LoadingIndicator />;

    if (this.state.error) return <LoadingError />;

    let {commitList} = this.state;

    if (!commitList.length) return <this.emptyState />;

    let commitsByRepository = commitList.reduce(function(cbr, commit) {
      let {repository} = commit;
      if (!cbr.hasOwnProperty(repository.name)) {
        cbr[repository.name] = [];
      }

      cbr[repository.name].push(commit);
      return cbr;
    }, {});
    return (
      <div>
        <div className="panel panel-default">
          <div className="panel-heading panel-heading-bold">
            <div className="row">
              <div className="col-xs-8">
                Commit
              </div>
              <div className="col-xs-2">
                <DropdownLink
                  caret={false}
                  className="btn btn-default btn-sm"
                  title={
                    <span>
                      {this.state.title}
                      <span
                        className="icon-arrow-down"
                        style={{marginLeft: 3, marginRight: -3}}
                      />
                    </span>
                  }
                >
                  <MenuItem key="all">
                    <a
                      onClick={() => {
                        this.setActiveRepo(null);
                      }}
                    >
                      All Repositories
                    </a>
                  </MenuItem>
                  {Object.keys(commitsByRepository).map(repository => {
                    return (
                      <MenuItem key={commitsByRepository[repository].id} noAnchor={true}>
                        <a
                          onClick={() => {
                            this.setActiveRepo(repository);
                          }}
                        >
                          {repository}
                        </a>
                      </MenuItem>
                    );
                  })}
                </DropdownLink>
              </div>
              <div className="col-xs-2 align-right">
                SHA
              </div>
            </div>
          </div>
        </div>
        {!this.state.activeRepo
          ? Object.keys(commitsByRepository).map(repository => {
              let activeCommits = commitsByRepository[repository];
              return (
                <div>
                  <span>{repository}</span>
                  <ul className="list-group list-group-lg commit-list">
                    {activeCommits.map(commit => {
                      return (
                        <ReleaseCommit
                          key={commit.id}
                          commitId={commit.id}
                          author={commit.author}
                          commitMessage={commit.message}
                          commitDateCreated={commit.dateCreated}
                          repository={commit.repository}
                        />
                      );
                    })}
                  </ul>
                </div>
              );
            })
          : this.renderCommitsForRepo()}
      </div>
    );
  }
});

export default ReleaseCommits;
export {ReleaseCommits, CommitLink};

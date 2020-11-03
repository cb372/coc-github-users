import { ExtensionContext, languages, workspace } from 'coc.nvim'
import { GitHubUsersCompletionProvider } from './provider'

export function activate(context: ExtensionContext): Promise<void> {
  const config = workspace.getConfiguration('coc.githubUsers')
  const accessToken = config.get<string>('githubAccessToken', process.env.COC_GITHUB_USERS_TOKEN)
  if (!accessToken) return

  const graphqlApiUrl = config.get<string>('graphqlApiUrl', process.env.COC_GITHUB_USERS_GRAPHQL_API_URL)
  const unixSocket = config.get<string>('unixSocket', process.env.COC_GITHUB_USERS_UNIX_SOCKET)

  const { subscriptions } = context

  const ghUsersCompletionProvider = new GitHubUsersCompletionProvider(
    accessToken,
    {
      graphqlApiUrl,
      unixSocket
    }
  )

  subscriptions.push(
    languages.registerCompletionItemProvider(
      'coc-github-users',
      'GH',
      null,
      ghUsersCompletionProvider,
      []
    )
  )
}

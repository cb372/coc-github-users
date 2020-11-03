import {
  CompletionContext,
  CompletionItemProvider
} from 'coc.nvim'
import {
  CompletionList,
  CompletionItem,
  CompletionItemKind,
  CancellationToken,
  Position,
  TextDocument
} from 'vscode-languageserver-protocol'

const url = require('url')
const axios = require('axios')

interface GitHubUser {
  login: string;
  name: string | null;
}

interface ProviderOptions {
  graphqlApiUrl?: string,
  unixSocket?: string,
}

export class GitHubUsersCompletionProvider implements CompletionItemProvider {

  private triggerPattern = /@(.{2,})/
  private nonWhitespaceCharPattern = /\S/

  constructor(private accessToken: string, private options: ProviderOptions) {}

  public async provideCompletionItems(
    _document: TextDocument,
    _position: Position,
    _token: CancellationToken,
    _context: CompletionContext,
  ): Promise<CompletionList> {
    const wordSoFar = this.getWordSoFar(_document, _position)
    const match = wordSoFar.match(this.triggerPattern)
    if (match) {
      const users = await this.searchGitHubUsers(match[1])
      return {
        isIncomplete: true,
        items: users.map<CompletionItem>(user => this.toCompletionItem(user, wordSoFar))
      }
    } else {
      return Promise.resolve({
        isIncomplete: true,
        items: []
      })
    }
  }

  private getWordSoFar(doc: TextDocument, pos: Position): string | null {
    const endOffset = doc.offsetAt(pos) - 1
    var startOffset = endOffset
    while (startOffset > 0 && doc.getText()[startOffset-1].match(this.nonWhitespaceCharPattern)) {
      startOffset--
    }
    const length = (endOffset - startOffset) + 1
    return doc.getText().substr(startOffset, length)
  }

  private async searchGitHubUsers(q: string): Promise<GitHubUser[]> {
    const query =
      `query {
        search(type: USER, query: "${q.replace(/_/g, ' ')}", first: 20) {
          nodes {
            ... on User {
              login
              name
            }
          }
        }
      }`

    try {
      const graphqlEndpoint = this.options.graphqlApiUrl || 'https://api.github.com/graphql'
      const requestConfig = { query }
      const endpointUrl = url.parse(graphqlEndpoint)

      const response = await axios.post(
        graphqlEndpoint,
        { query },
        {
          headers: {
            Authorization: 'Bearer ' + this.accessToken,
            Host: endpointUrl.host
          },
          socketPath: this.options.unixSocket,
        }
      )

      return response.data.data.search.nodes
    } catch (error) {
      console.error(error)
      return []
    }
  }

  private toCompletionItem(user: GitHubUser, wordSoFar: string): CompletionItem {
    var label;
    if (user.name) {
      label = `@${user.login} (${user.name})`
    } else {
      label = `@${user.login}`
    }
    return {
      label,
      kind: CompletionItemKind.Text,
      insertText: user.login,
      filterText: wordSoFar // don't filter out any results
    }
  }

}

const { ApolloServer, gql } = require('apollo-server');
const Contentful = require("contentful");

const SPACE_ID = "dm0i1bxzikc3";
const ACCESS_TOKEN = "51f222821a25bbd4e496b2308c3d71e09dd531142ed690d5ab333feeed7c1467";

const typeDefs = gql`
  type AggregationPage {
    id: ID
    title: String
    blogs: [Blog]
  }

  type Blog {
    id: ID
    description: String
    title: String    
    thumbnail: Thumbnail
  }

  type Thumbnail {
    title: String
    url: String
  }

  type Article {
    id: ID
    title: String
    description: String
    body: [Body]
    thumbnail: Thumbnail
  }

  type Content {
    node_type: String
    content: [Content]
    value: String
    marks: [Mark]
  }

  type Mark {
    type: String
  }

  type Body {
    id: ID
    node_type: String
    content: [Content]
    content_type: String
  }

  type Query {
    AggregationPages(id: ID): AggregationPage
    Article: Article
  }
`;

function convert_thumbnail (thumbnail) {
  return {
    title: thumbnail.fields.title,
    url: thumbnail.fields.file.url
  };
}

function convert_blogs (blogs) {
  
  return blogs.map(function(blog) {
    return {
      id: blog.sys.id,
      description: blog.fields.description,
      title: blog.fields.title,
      thumbnail: convert_thumbnail(blog.fields.thumbnail)
    };
  });
}

function convert_marks (marks) {
  return marks.map(function(mark) {
    return {
      type: mark.type
    };
  });
}

function convert_content (content_elements) {  
  return content_elements.map(function(content_element) {
    var results = {
      node_type: content_element.nodeType
    };

    if (content_element.value){
      results.value = content_element.value;
    }
    if (content_element.marks){
      results.marks = convert_marks(content_element.marks);
    }

    if (content_element.content){
      results.content = convert_content(content_element.content);
    }
    return results;
  });
}

function convert_body (body_elements) {
  return body_elements.map(function(body_element) {
    return {
      id: body_element.sys.id,
      content: convert_content(body_element.fields.richParagraph.content),
      node_type: body_element.nodeType,
      content_type: body_element.sys.contentType.sys.id
    };
  });
}

function convert_entries_to_aggregation_pages (entries) {
  return {
    id: entries.sys.id,
    title: entries.fields.title,
    blogs: convert_blogs(entries.fields.blogs)
  }
}

function convert_entries_to_articles (entries) {
  return {
    id: entries.sys.id,
    title: entries.fields.title,
    description: entries.fields.description,
    body: convert_body(entries.fields.body),
    thumbnail: convert_thumbnail(entries.fields.thumbnail)
  }
}

const resolvers = {
  Query: {
    AggregationPages: (parent, args, context) => {
      return context.contentful.getEntry(args.id).then(entries => {
        
        return convert_entries_to_aggregation_pages(entries);
      })
    },
    Article: (parent, args, context) => {
      return context.contentful.getEntry("47n1sYzPqUOmyGAKaaAUEM").then(entries => {
        return convert_entries_to_articles(entries);
      })
    }
  },
};

const server = new ApolloServer({ 
  typeDefs, 
  resolvers,
  context: async () => ({
    contentful: await Contentful.createClient({
        space: SPACE_ID,
        accessToken: ACCESS_TOKEN
      }),
  }) 
});

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});

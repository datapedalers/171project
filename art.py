
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os

# Load the dataset
df = pd.read_csv('merged_datasets.csv', low_memory=False)

# Ensure creation_year is numeric
df['creation_year'] = pd.to_numeric(df.get('creation_year'), errors='coerce')
df = df.dropna(subset=['creation_year'])
df['creation_year'] = df['creation_year'].astype(int)

# Identify subject columns (those that start with 'has_')
subject_cols = [c for c in df.columns if c.startswith('has_')]
if not subject_cols:
	raise RuntimeError('No subject columns found (no columns starting with "has_")')

# Convert subject presence to boolean (present if value > 0)
subject_df = df[subject_cols].apply(pd.to_numeric, errors='coerce').fillna(0) > 0
subject_df['creation_year'] = df['creation_year'].values

# Group by year and sum the boolean presence to get counts per year
counts_by_year = subject_df.groupby('creation_year').sum()

# Transpose so rows=subjects, cols=years
subjects_by_year = counts_by_year.T

# Clean subject names for display
subjects_by_year.index = subjects_by_year.index.str.replace('^has_', '', regex=True).str.replace('_', ' ').str.title()

# Sort years ascending
years = sorted(subjects_by_year.columns.tolist())
subjects_by_year = subjects_by_year[years]

# Compute cumulative counts across years (cumulative sum left-to-right)
cumulative_subjects = subjects_by_year.cumsum(axis=1)

# Plot a heatmap of cumulative counts: subjects (y) vs years (x)
data = cumulative_subjects.values
fig_height = max(6, 0.4 * data.shape[0])
fig, ax = plt.subplots(figsize=(12, fig_height))
im = ax.imshow(data, aspect='auto', cmap='viridis', origin='lower')

# Axis labels and ticks
ax.set_yticks(np.arange(data.shape[0]))
ax.set_yticklabels(cumulative_subjects.index)
# Reduce xtick labels if there are many years
num_years = data.shape[1]
max_xticks = 12
step = max(1, num_years // max_xticks)
xticks = np.arange(0, num_years, step)
ax.set_xticks(xticks)
ax.set_xticklabels([str(years[i]) for i in xticks], rotation=45, ha='right')

ax.set_xlabel('Year')
ax.set_title('Cumulative Subjects over Time (cumulative photo counts)')
cb = fig.colorbar(im, ax=ax)
cb.set_label('Cumulative Number of Photos')

plt.tight_layout()

# Save the figure and attempt to show it
out_path = 'subjects_over_time_heatmap.png'
fig.savefig(out_path, dpi=150)
print(f'Saved cumulative heatmap to {out_path}')
try:
	plt.show()
except Exception:
	# In environments without a display, plt.show() can fail; we already saved the image
	pass

# --- Line chart for top-N subjects over time ---
def plot_top_subjects_lines(subjects_by_year, top_n=10, out_file='subjects_over_time_lines.png'):
	# subjects_by_year: DataFrame rows=subjects, cols=years (expected cumulative counts)
	# Choose top subjects by final cumulative count (last year)
	if subjects_by_year.shape[1] == 0:
		print('No year columns available to plot.')
		return
	last_year_col = subjects_by_year.columns[-1]
	totals = subjects_by_year[last_year_col].sort_values(ascending=False)
	top_subjects = totals.head(top_n).index.tolist()
	if not top_subjects:
		print('No subjects to plot for line chart.')
		return

	fig2, ax2 = plt.subplots(figsize=(12, 6))
	cmap = plt.get_cmap('tab10')
	years = subjects_by_year.columns.tolist()

	for i, subject in enumerate(top_subjects):
		y = subjects_by_year.loc[subject, years].values
		ax2.plot(years, y, marker='o', label=subject, color=cmap(i % 10))

	ax2.set_xlabel('Year')
	ax2.set_ylabel('Cumulative Number of Photos')
	ax2.set_title(f'Top {len(top_subjects)} Subjects Cumulative Over Time')
	ax2.legend(title='Subject', bbox_to_anchor=(1.05, 1), loc='upper left')
	plt.tight_layout()
	fig2.savefig(out_file, dpi=150)
	print(f'Saved line chart to {out_file}')
	try:
		plt.show()
	except Exception:
		pass


# Plot top 10 subjects by default using cumulative counts
plot_top_subjects_lines(cumulative_subjects, top_n=10)